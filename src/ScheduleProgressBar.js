
import  { Calc } from  './Calc.js';
import  { Element } from  './Element.js';
import * as dragNdrop from 'npm-dragndrop/src/dragNdrop.js';

export class ScheduleProgressBar {

	constructor(element, visualizer){
        this._container=element;
        this._visualizer=visualizer;
        

        this._element=element.parentNode.insertBefore(new Element('div', {
            "class":"schedule-progress"
        }), element);


        this._progress= this._element.appendChild(new Element('div', {
            "class":"progress"
        }));

        this._progress.style.cssText='--progress:35%;';

        this._label(this._element.appendChild(new Element('div', {
            "class":"start"
        })), '4am');

        this._setProgress(this._element.appendChild(new Element('div', {
            "class":"nine tick"
        })), 5*60, '9am');

        this._setProgress(this._element.appendChild(new Element('div', {
            "class":"noon"
        })), 8*60, 'Midday');

        this._setProgress(this._element.appendChild(new Element('div', {
            "class":"four"
        })), 12*60, '4pm');

        this._setProgress(this._element.appendChild(new Element('div', {
            "class":"five tick"
        })), 13*60, '5pm');

        this._setProgress(this._element.appendChild(new Element('div', {
            "class":"midnight tick"
        })), 20*60, 'Midnight');

        this._label(this._element.appendChild(new Element('div', {
            "class":"end"
        })), '4am');


        this._indicators=[];
        this._active=null;
        this._visualizer.on('select', (i)=>{

            if(this._active&&this._indicators.indexOf(this._active)!==i){
                this._active.classList.remove('active');
            }
            if(this._indicators.length>i){
                this._indicators[i].classList.add('active');
                this._active=this._indicators[i];
            }

        });

        this._visualizer.on('update',(datasets)=>{

            var duration=this._visualizer.calcFullDurationTo(datasets.length);

            this._progress.style.cssText='';
            this._setProgress(this._progress, duration);

            this._element.dataset['progress']=this._getPercent(duration)

            while(this._indicators.length>datasets.length){
                var removeItem=this._indicators.pop();
                this._element.removeChild(removeItem);
            }   

            

            datasets.forEach((dataset, index) => {
                var item;
                if(index<this._indicators.length){
                    item=this._indicators[index];
                }else{
                    item=this._element.appendChild(new Element('div', {
                        "class":"indicator",
                        "events":{
                            "click":()=>{
                                this._visualizer.setCurrentIndex(index);
                            }
                        }
                    }));

                    if(this._visualizer.getCurrentIndex()===index){

                        if(this._active&&this._indicators.indexOf(this._active)!==index){
                            this._active.classList.remove('active');
                        }

                        item.classList.add('active');
                        this._active=item;
                    }

                   

                    this._indicators.push(item);
                }

                item.style.cssText='';

                this._setProgress(item, this._visualizer.calcFullDurationTo(index));
                this._setDuration(item, this._visualizer.calcDurationOf(index));


                var c=window.getComputedStyle(document.querySelector('.schedule-item[data-index="'+index+'"]')).backgroundColor;
                item.style.cssText+='--color:'+c+';';

            });

        })

    }
    _getPercent(mins){
        return Math.round((Math.min(24*60, mins)*1000)/(24*60))/10;
    }
    _setDuration(el, mins){
        el.style.cssText+='--duration:'+this._getPercent(mins)+'%;';
    }
    _setProgress(el, mins, label){
        el.style.cssText+='--progress:'+this._getPercent(mins)+'%;';

        if(label){
            this._label(el, label)
        }
    }

    _label(el, label){
        el.dataset['label']=label;
    }

    getElement(){
        return this._item;
    }


    remove(){
     
    }

}
