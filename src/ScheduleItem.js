
import  { Calc } from  './Calc.js';
import  { Element } from  './Element.js';
import * as dragNdrop from 'npm-dragndrop/src/dragNdrop.js';

export class ScheduleItem {

	constructor(element, visualizer){
        this._container=element;
        this._visualizer=visualizer;

        this._minDuration=15;
        
    }

    getElement(){
        return this._item;
    }


    remove(){
        this._container.removeChild(this._item);
        delete this._container;
        delete this._visualizer;
        delete this._dataset;
        delete this._datasets;

        if(this._insert){
            this._container.removeChild(this._insert);
            delete this._insert;
        }

        if(this._append){
            this._container.removeChild(this._append);
            delete this._append;
        }

    }


    create(index, dataset, datasets){

        this._vars={}
        this._index=index;
        this._dataset=dataset;
        this._datasets=datasets;


        
        this._addInsert();
        

        this._item=this._container.appendChild(new Element('div', {
            "class":"schedule-item",
            "events":{
                "click":()=>{
                    this._visualizer.setCurrentIndex(this._index);
                }
            }
        }));

        this._styleItem();

        this._addAppend();

        return this._item;
    }


    update(index, dataset, datasets){
     
        this._vars={}
        this._index=index;
        this._dataset=dataset;
        this._datasets=datasets;


       
        this._addInsert();
        
        
        
        var item=this._item;
        item.style.cssText='';
        item.innerHTML='';

        var itemElement=this._visualizer.getItemElement(index);

        Object.keys(item.dataset).forEach((key) => {
            delete item.dataset[key];          
        });

        

        this._styleItem();

        this._addAppend();

        return item;
    }

    _styleItem(){

        var item=this._item;
        var index=this._index;
        var dataset=this._dataset;
        var datasets=this._datasets;

        var itemElement=this._visualizer.getItemElement(index);

        Object.keys(dataset).forEach((key)=>{
            item.dataset[key]=dataset[key];

            if(key.split('Time').pop()===''){
                //ends with 'Time'
                if((!dataset[key])||dataset[key]===""){
                    return; //incase empty value - avoid NAN
                }

                item.dataset[key+'AmPm']=this._formatTime(dataset[key]);
                itemElement.dataset[key+'AmPm']=this._formatTime(dataset[key]);
            }

        });

        item.dataset['index']=index;

        this._addTransitIndicators();
        this._addDurationIndicators();
        this._addActivityLabel();
        this._addDragTimeHandles();
        
        return item;
    }


    _addInsert(){

        if(this._index==0){
            
            if(this._insert){
                this._container.removeChild(this._insert);
                delete this._insert;
            }
            return;
        }


        if(this._insert){
            return;
        }

        

        this._insert=this._container.appendChild(new Element('button',{
            "html":"Insert Activity",
            "class":"add-item-btn insert-btn",
            events:{
                click:(e)=>{
                    e.stopPropagation();
                    e.preventDefault();
                    this._visualizer.insertItem(this._index);
                }
            }
        }));

        if(this._item){
            this._container.insertBefore(this._insert, this._item);
        }
    }

    _addAppend(){

        if(this._index<this._datasets.length-1){
            if(this._append){
                this._container.removeChild(this._append);
                delete this._append;
            }
            return;
        }


        if(this._append){
            return;
        }

        this._append=this._container.appendChild(new Element('button',{
            "html":"Add Activity",
            "class":"add-item-btn",
            events:{
                click:(e)=>{
                    e.stopPropagation();
                    e.preventDefault();

                    this._visualizer.appendItem();
                }
            }
        }));


        if(this._item&&this._item.nextSibling&&this._item.nextSibling!==this._append){
            this._container.insertBefore(this._append, this._item.nextSibling);
        }

    }




    _addTransitIndicators(){

        var item=this._item;
        var index=this._index;
        var dataset=this._dataset;
        var datasets=this._datasets;

        if(index>0&&datasets[index-1].locationType!==dataset.locationType){
            var transitEl=item.appendChild(new Element('div', {
                "class":"transit"
            }));

            var travelDuration=this._duration(datasets[index-1].endTime, dataset.startTime);
            var travelDurationHeight=this._durationToHeight(travelDuration);
            transitEl.style.cssText = '--travelHeight:'+travelDurationHeight+"px;";
        }

    }

    _addDurationIndicators(){

        var item=this._item;
        var index=this._index;
        var dataset=this._dataset;
        var datasets=this._datasets;

        var duration=this._duration(dataset);
        item.dataset['duration']=duration;
        


        var durationEl=item.appendChild(new Element('div', {
            "class":"duration"
        }))

        var durationHeight=this._durationToHeight(duration); //Math.round(duration/15)*10;
        //durationEl.style.cssText = '--durationHeight:'+durationHeight+"px;";
        durationEl.dataset['durationHr']=this._formatDuration(duration);

        this._addVars({
            "durationHeight":durationHeight+"px"
        });

        if(index>0&&datasets[index-1].locationType!==dataset.locationType){

            var travelDuration=this._duration(datasets[index-1].endTime, dataset.startTime);

            var travelDurationEl=item.appendChild(new Element('div', {
                "class":"travel-duration"
            }));
            var travelDurationHeight=this._durationToHeight(travelDuration);
            //travelDurationEl.style.cssText = '--travelHeight:'+travelDurationHeight+"px;";
            this._addVars({
                "travelHeight":travelDurationHeight+"px"
            });
            

            travelDurationEl.dataset['travel']=travelDuration;
            travelDurationEl.dataset['travelHr']=this._formatDuration(travelDuration);
           

        }

    }

    _addActivityLabel(){

        var item=this._item;
        var index=this._index;
        var dataset=this._dataset;

        var activityOpt=null;
        if(dataset.locationType==="0"){
            activityOpt=this._visualizer.getItemInput(index, 'inHomeActivity');
        }
        if(dataset.locationType==="1"){
            activityOpt=this._visualizer.getItemInput(index, 'workActivity');
        }
        if(dataset.locationType==="2"){
            activityOpt=this._visualizer.getItemInput(index, 'otherActivity');
        }

        if(activityOpt){
            var selected=Array.prototype.slice.call(activityOpt.options, 0).filter((option)=>{
                return option.value===activityOpt.value;
            });
            if(selected.length){
                var label=selected[0].innerHTML;
                item.appendChild(new Element('div', {
                    "class":"activity"
                })).dataset['activity']=label;
            }
        }


    }

 





     _addDragTimeHandles(){

        var item=this._item;
        var index=this._index;
        var dataset=this._dataset;
        var datasets=this._datasets;
        

        if(index>0&&datasets[index-1].locationType!==dataset.locationType){

            /**
             * only adjust transit
             */

            var itemStartHandle=item.appendChild(new Element('div', {
                "class":"drag-start"
            }));


            dragNdrop({
                element:itemStartHandle,
                constraints:'y',
                callback: (event) =>{
                    event.element.style.cssText = '';
                }
            });

        }

        var itemEndHandle=item.appendChild(new Element('div', {
            "class":"drag-end"
        }));

        item.addEventListener('touchmove', (e)=>{
            //e.preventDefault();
        })

        dragNdrop({
            element:itemEndHandle,
            constraints:'y',
            callback: (event) =>{
                event.element.style.cssText = '';
            },
            container:this._container
        });

        var currentDuration;

        itemEndHandle.addEventListener('dragNdrop:start', ()=>{
            item.classList.add('resizing');
            item.parentNode.classList.add('rs');
            currentDuration=this._duration(dataset);
        });


        var _y=0;
        var _d=0;



        

        itemEndHandle.addEventListener('dragNdrop:drag', ()=>{
            
            //z-index: 1000; cursor: row-resize; transform: translate3d(0px, 47px, 1px);
            var offsets=itemEndHandle.style.cssText.split('translate3d(').pop().split(')').shift().split(',');
            var y=parseInt(offsets[1]);

            var snap=this._minDuration;
            var mind=snap-currentDuration;
            var maxd=10*60; //max 10hr activity

            var snapPixels=this._durationToHeight(snap);

            y=Math.floor(y/snapPixels)*snapPixels;
            var d=this._heightToDuration(y);

            console.log(y+"->"+d);

            d=Math.max(mind, Math.min(d, maxd));

            var miny=this._durationToHeight(mind);
            var maxy=this._durationToHeight(maxd);

            y=Math.max(miny, Math.min(y, maxy));

            if(y!=_y&&(!isNaN(y))){

                _y=y;
                _d=d;
                console.log(y);
                var _end=this._snapOffsetEnd(dataset.endTime, d, snap);

                this._setDraggingStyles(item, _d, _y, _end);
            }
        });

        itemEndHandle.addEventListener('dragNdrop:stop', ()=>{
            this._clearDraggingStyles(item)
            console.log(_y);

            var endTime=this._visualizer.getItemInput(index, 'endTime');
            endTime.value=this._snapOffsetEnd(dataset.endTime, _d, this._minDuration);
            this._visualizer.needsRedraw();

            _y=0;

        });


    }


    _clearDraggingStyles(item){
        item.classList.remove('resizing');
        item.classList.remove('rs-neg');
        item.parentNode.classList.remove('rs');

        this._removeVars([
            "resizeHeight",
            "addDuration",
            "dragEndTime",
        ]);
    }

    _setDraggingStyles(item, dur, y, end){

        var snap=this._minDuration;

        if(dur==0){
            item.classList.add('z-dur');
            
            item.classList.remove('dur-1');
            item.classList.remove('dur--1');
        }else if(dur==snap){
            item.classList.add('dur-1');
            item.classList.remove('z-dur');
            item.classList.remove('dur--1');
        }else if(dur==-snap){
            item.classList.add('dur--1');

            item.classList.remove('z-dur');
            item.classList.remove('dur-1');
        }else{
            item.classList.remove('z-dur');
            item.classList.remove('dur-1');
            item.classList.remove('dur--1');
        }


        if(dur==0){
            item.classList.add('z-dur');
        }

        if(dur<0){
            item.classList.add('rs-neg');
        }else{
            item.classList.remove('rs-neg');
        }

        this._addVars({
            "resizeHeight":+y+'px',
            "addDuration":'"'+this._formatDuration(dur)+'"',
            "dragEndTime":'"'+this._formatTime(end)+'"'
        })
        
    }








    _formatDuration(minutes){
        return (new Calc()).formatDuration(minutes);
    }


    _formatTime(str){
        return (new Calc()).formatTime(str);
    }

    _duration(startTime, endTime){
        return (new Calc()).duration(startTime, endTime);
    }


    _durationToHeight(d){
        return Math.round(d/15)*10;
    }

    _heightToDuration(h){
        return Math.round(h/10)*15;
    }

    _addOffset(value, addOffset){
        return (new Calc()).addOffset(value, addOffset)
    }

    _snapOffsetEnd(value, addOffset, snap){
       return (new Calc()).snapToTime(value, addOffset, snap)
    }


    _addVars(obj){
        
        Object.keys(obj).forEach((k)=>{
            this._vars[k]=obj[k];
        })

        this._item.style.cssText=Object.keys(this._vars).map((k)=>{
            return '--'+k+':'+this._vars[k]+';'
        }).join(' ');
    }

    _removeVars(vars){
        
        vars.forEach((k)=>{
            delete this._vars[k];
        })

        this._item.style.cssText=Object.keys(this._vars).map((k)=>{
            return '--'+k+':'+this._vars[k]+';'
        }).join(' ');
    }




}