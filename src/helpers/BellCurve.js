export class BellCurve {

    constructor(svg) {
        if(svg){
            this._svg=svg;
        }
    }

    _bellCurve(x) {
        const stdDev=this._stdDev;
        const mean=this._mean;
        return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    }

    _pointX(x){

        const avgMin=this._avgMin;
        const avgMax=this._avgMax;
        const stdDev=this._stdDev;

       return ((x - (avgMin - 3 * stdDev)) / ((avgMax + 3 * stdDev) - (avgMin - 3 * stdDev))) * 590;
    }
    _pointY(x){
        const maxY=this._maxY;
        return (1 - (this._bellCurve(x) / maxY)) * 50;
    }


    addPoint(xValue){
       this._point=this._addCircle(xValue, this._point);
       this._svg.appendChild(this._point);
       this._point.classList.add('point');
    }

    addClass(cls){
        this._svg.classList.remove(...this._svg.classList);
        this._svg.classList.add(cls);
    }
    addLabel(xValue, text){
        this._label=this._addLabel(xValue, text, this._label);
        this._svg.appendChild(this._label);
        //this._label.classList.add('point');
     }
    _addLabel(xValue, text, textEl){
        const avgMin=this._avgMin;
        const avgMax=this._avgMax;

        const stdDev=this._stdDev;
        const maxY=this._maxY;

        const pointX = this._pointX(xValue);
        let pointY = this._pointY(xValue)
        if(pointY<20){
            pointY=pointY+25;
        }else{
            pointY=pointY-15;
        }
        
        
        if(!textEl){
            textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        }

        textEl.textContent = text;
        
        textEl.setAttribute('x', pointX);
        textEl.setAttribute('y', pointY);
      
        
        return textEl;
    }
    _addCircle(xValue, circle) {

        const avgMin=this._avgMin;
        const avgMax=this._avgMax;

        const stdDev=this._stdDev;
        const maxY=this._maxY;

        const pointX = this._pointX(xValue);
        const pointY = this._pointY(xValue);
        
        if(!circle){
            circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        }
        
        circle.setAttribute('cx', pointX);
        circle.setAttribute('cy', pointY);
        circle.setAttribute('r', 2);
        circle.setAttribute('fill', 'red');
        
        return circle;
    }

    getElement(){
        if(!this._svg){
            this._svg=document.createElementNS("http://www.w3.org/2000/svg", "svg");
        }
        return this._svg;
    }

    drawBellCurve(avgMin, avgMax, svg) {

        this._avgMin=avgMin;
        this._avgMax=avgMax;
        this._svg=svg;

        if(!svg){
            svg=document.createElementNS("http://www.w3.org/2000/svg", "svg");
            this._svg=svg;
        }
        svg.setAttribute("viewBox", "-5 -5 600 60");
        svg.setAttribute("preserveAspectRatio","none");
        svg.innerHTML = ''; // Clear existing elements

        // Calculate mean and standard deviation
        const mean = (avgMin + avgMax) / 2;
        const stdDev = (avgMax - avgMin) / 4;
        
        this._mean=mean;
        this._stdDev=stdDev;

        // Calculate the maximum value of the bell curve for normalization
        const maxY = this._bellCurve(mean);
        this._maxY=maxY;

        let x=avgMin - 3 * stdDev;

        ([avgMin, avgMax, avgMax + 3 * stdDev]).forEach((max, i)=>{

            let pathData = '';
            for (x; x <= max; x += 0.1) {
                
                const pointX = this._pointX(x);
                const pointY = this._pointY(x);
    
                pathData += `${pointX},${pointY} `;
            }
    
            // Create the SVG path element
            const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            path.setAttribute('points', pathData.trim());
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', 'blue');
            path.setAttribute('stroke-width', '0.5');
    
            // Append the path to the SVG
            svg.appendChild(path);

            path.classList.add('path-'+i);

        });

        // Generate the path data using percentage values
        


        svg.appendChild(this._addCircle(avgMin));
        svg.appendChild(this._addCircle(avgMax));

        return svg;
    }

}