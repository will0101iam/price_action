import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';

export const ChartComponent = ({ data }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const seriesRef = useRef(null);

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
            upColor: '#F23645', // Red for Rise
            downColor: '#089981', // Green for Fall
            borderVisible: false,
            wickUpColor: '#F23645',
            wickDownColor: '#089981',
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
        
        try {
            createSeriesMarkers(candlestickSeries, baseMarkers);
        } catch (e) {
            console.error("Failed to create markers plugin", e);
        }
        
        // Fit content
        chart.timeScale().fitContent();

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, [data]);

    return (
        <div className="chart-wrapper" style={{ height: '100%', width: '100%' }}>
            <div ref={chartContainerRef} style={{ position: 'relative', width: '100%', height: '100%' }} />
        </div>
    );
};
