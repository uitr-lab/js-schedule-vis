export class BellCurve {

    constructor() {

    }

    drawBellCurve(avgMin, avgMax) {
        const svg = document.getElementById('bellCurve');
        svg.innerHTML = ''; // Clear existing elements

        // Calculate mean and standard deviation
        const mean = (avgMin + avgMax) / 2;
        const stdDev = (avgMax - avgMin) / 6;

        // Define the bell curve function
        function bellCurve(x) {
            return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
        }

        // Calculate the maximum value of the bell curve for normalization
        const maxY = bellCurve(mean);

        // Generate the path data using percentage values
        let pathData = '';
        for (let x = avgMin - 3 * stdDev; x <= avgMax + 3 * stdDev; x += 0.1) {
            // Map x to a percentage (0 to 100) for the SVG viewBox
            const percentX = ((x - (avgMin - 3 * stdDev)) / ((avgMax + 3 * stdDev) - (avgMin - 3 * stdDev))) * 100;
            
            // Map y to a percentage (0 to 100) for the SVG viewBox (inverted for SVG y-axis direction)
            const percentY = (1 - (bellCurve(x) / maxY)) * 100;

            pathData += `${percentX},${percentY} `;
        }

        // Create the SVG path element
        const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        path.setAttribute('points', pathData.trim());
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'blue');
        path.setAttribute('stroke-width', '0.5');

        // Append the path to the SVG
        svg.appendChild(path);
    }
}