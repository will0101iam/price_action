import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';

export const ChartComponent = ({ data, onCandleSelect }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'white' },
                textColor: 'black',
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight, // Use container height
            grid: {
                vertLines: { color: '#e1e1e1' },
                horzLines: { color: '#e1e1e1' },
            },
            rightPriceScale: {
                borderColor: '#cccccc',
            },
            timeScale: {
                borderColor: '#cccccc',
            },
        });

        chartRef.current = chart;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ 
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        };
        
        // Use ResizeObserver for more robust resizing
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
        seriesRef.current = candlestickSeries;

        candlestickSeries.setData(data);

        // Add markers for indexing
        // Show index for every 2nd candle (1, 3, 5, 7...) as requested
        const baseMarkers = data
            .filter((d, index) => index % 2 === 0)
            .map(d => ({
                time: d.time,
                position: 'belowBar',
                color: '#2196F3',
                shape: 'arrowUp',
                text: `#${d.id}`,
            }));
        
        // Use createSeriesMarkers plugin if available, or fallback? 
        // Assuming createSeriesMarkers is the correct API for this version based on previous code.
        let markersPlugin = null;
        try {
            markersPlugin = createSeriesMarkers(candlestickSeries, baseMarkers);
        } catch (e) {
            console.error("Failed to create markers plugin", e);
        }
        
        // Fit content
        chart.timeScale().fitContent();

        // Click Handler
        chart.subscribeClick((param) => {
            if (param.time) {
                const clickedCandle = data.find(d => d.time === param.time);
                if (clickedCandle) {
                    setSelectedIndex(clickedCandle.id);
                    onCandleSelect(clickedCandle);
                    
                    // Update markers to highlight selection
                    const newMarkers = [
                        ...baseMarkers,
                        {
                            time: clickedCandle.time,
                            position: 'aboveBar',
                            color: '#FFD700', // Gold
                            shape: 'arrowDown',
                            text: `Select #${clickedCandle.id}`,
                            size: 2,
                        }
                    ];
                    if (markersPlugin) {
                        markersPlugin.setMarkers(newMarkers);
                    }
                }
            }
        });

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, [data, onCandleSelect]);

    return (
        <div className="chart-wrapper" style={{ height: '100%', width: '100%' }}>
            <div ref={chartContainerRef} style={{ position: 'relative', width: '100%', height: '100%' }} />
            {selectedIndex && (
                <div className="selection-info">
                    Selected Candle: <strong>#{selectedIndex}</strong>
                </div>
            )}
        </div>
    );
};
