export function generateData(count = 100) {
    const data = [];
    let time = new Date("2023-01-01").getTime() / 1000;
    let open = 100;
    let close = 100;
    let high = 100;
    let low = 100;

    for (let i = 0; i < count; i++) {
        const volatility = 2; // Price movement range
        const change = (Math.random() - 0.5) * volatility;
        
        open = close;
        close = open + change;
        high = Math.max(open, close) + Math.random() * volatility * 0.5;
        low = Math.min(open, close) - Math.random() * volatility * 0.5;

        // Ensure high/low consistency
        if (high < low) {
             const temp = high;
             high = low;
             low = temp;
        }

        // Color logic (implicit in open/close)
        
        data.push({
            time: time + i * 86400, // Daily candles
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            id: i + 1, // Visual Index
        });
    }
    return data;
}

export function getRandomSlice(fullData, windowSize = 30) {
    if (fullData.length <= windowSize) return fullData;
    const maxStartIndex = fullData.length - windowSize;
    const startIndex = Math.floor(Math.random() * maxStartIndex);
    return fullData.slice(startIndex, startIndex + windowSize);
}
