import  { EventEmitter } from  'events';
import  { Element } from  './Element.js';
import  { Calc } from  './Calc.js';

import * as dragNdrop from 'npm-dragndrop/src/dragNdrop.js';


/**
 * This is specific to the UiTR Transit lab survey
 */

export class ScheduleVisualizer extends EventEmitter {

	constructor(list){
		super();

        this._minDuration=15;
        this._initialItem={

        };

        this._list=list;


        // This is already added in index.html for my survey
        // list.setDatasetKeyFormatter(function(key){
        //    return key.replace(/\d+$/, "") //strip trailing numbers
        // });
        
        
        this._list.on('addItem', this._setTimes.bind(this));
        this._list.getItems().forEach(this._setTimes.bind(this));



        this._element=list.getElement().parentNode.insertBefore(new Element('div', {
            "class":"schedule-vis"
        }), list.getElement());

        
        this._element.parentNode.removeChild(this._element.previousSibling);     
        this._list.on('update', ()=>{
            try{
                this._redraw();
            }catch(e){
                console.error(e);
            }
        });

        this._redraw();
	}


    _setTimes(itemEl, index){

        

        var _isEmpty=(field)=>{
            return field.value==""||field.value=="select an option";
        }






        var inputStart=this._list.getItemInput(index, 'startTime');
        var inputEnd=this._list.getItemInput(index, 'endTime');


        if(_isEmpty(inputStart)){

            if(index>0){
                var lastEnd=this._list.getItemInput(index-1, 'endTime');
                inputStart.value=lastEnd.value;
            }else{
               
               inputStart.value="04:00"; 
               inputStart.classList.add('disabled');
               if(inputEnd.value===""){
                   inputEnd.value="06:30";
               }

            }

            
        }


        var inputLocation=this._list.getItemInput(index, 'locationType');

        if(_isEmpty(inputLocation)){

            if(index==0){

                inputLocation.value="0";
                var inputHomeActivity=this._list.getItemInput(index, 'inHomeActivity');
                if(_isEmpty(inputHomeActivity)){
                    inputHomeActivity.value="0";
                }
            }else{

                var inputLastLocation=this._list.getItemInput(index-1, 'locationType');
                inputLocation.value=inputLastLocation.value;
            }
        }


   


        if(_isEmpty(inputEnd)){

            inputEnd.value=this._addOffset(inputStart.value, 30);

        }


        this._list.needsUpdate();

    }
    _addOffset(value, addOffset){
        return (new Calc()).addOffset(value, addOffset)
    }

    _snapOffsetEnd(value, addOffset, snap){
       return (new Calc()).snapToTime(value, addOffset, snap)
    }

    _empty(){
        this._element.innerHTML='';
    }

    _addInsert(index){

        this._element.appendChild(new Element('button',{
            "html":"Insert Activity",
            "class":"add-item-btn insert-btn",
            events:{
                click:(e)=>{
                    e.stopPropagation();
                    e.preventDefault();
                    this._list.insertItem(index);
                }
            }
        }));
    }

    _addAppend(){
        this._element.appendChild(new Element('button',{
            "html":"Add Activity",
            "class":"add-item-btn",
            events:{
                click:(e)=>{
                    e.stopPropagation();
                    e.preventDefault();

                    this._list.addItem();
                }
            }
        }));
    }


    _addItem(index, dataset, datasets){
        var item = this._element.appendChild(new Element('div', {
            "class":"schedule-item",
            "events":{
                "click":()=>{
                    this._list.setCurrentIndex(index);
                    item.classList.add("active");
                    if(this._active){
                        this._active.classList.remove("active");
                    }
                }
            }
        }));

        var itemElement=this._list.getItemElement(index);
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

        this._addTransitIndicators(item, index, dataset, datasets);
        this._addDurationIndicators(item, index, dataset, datasets);
        this._addActivityLabel(item, index, dataset);
        this._addDragTimeHandles(item, index, dataset, datasets);

        return item;
    }

    _redraw(){
        this._isRendering=true;
        this._empty();
        this._needsRedraw=false;


        this._element.appendChild(new Element('span',{
            "class":"intro"
        }));

        var currentIndex=this._list.getCurrentIndex();
        this._active=null;

        var datasets=this._list.getItemsData();

        var shouldBreak=false;

        datasets.forEach((dataset, index)=>{

           

            if(shouldBreak){
                return;
            }


            if(index>0){
                this._addInsert(index);
            }

            var item=this._addItem(index, dataset, datasets);

            if(currentIndex===index){
                item.classList.add("active");
                this._active=item;
            }
		


            if(this._canHaveTravelTime(index, dataset, datasets)){
                var travelDuration=this._duration(datasets[index-1].endTime, dataset.startTime);

                if(isNaN(travelDuration)){
                    throw 'Invalid travel duration';
                }

                if(travelDuration<=0){
                    shouldBreak=true;
                    var inputStart=this._list.getItemInput(index, 'startTime');
                    inputStart.value=this._addOffset(datasets[index-1].endTime, this._minDuration);
                    this._scheduleRedraw();
                    return;
                }
            }else{

                /**
                 * Should not allow any travel duration.
                 */

                if(index>0){

                    var travelDuration=this._duration(datasets[index-1].endTime, dataset.startTime);

                    if(isNaN(travelDuration)){
                        throw 'Invalid travel duration';
                    }

                    if(travelDuration!==0){

                        // Snap {n-1}.endTime to {n}.startTime
                        // can either move {n-1}.endTime, or {n}.startTime

                        var calcPreviousDuration=this._duration(datasets[index-1].startTime, dataset.startTime);
                        
                        var inputStart=this._list.getItemInput(index, 'startTime');

                        if(currentIndex==index){

                            

                            /**
                             * if setting time to PM from AM then it 
                             * 
                             * if {n}.startTime < {n-1}.startTime then 
                             */


                            shouldBreak=true;

                            if(inputStart===document.activeElement){
                                this._delayUpdate(inputStart);
                                return;
                            }

                            var inputEnd=this._list.getItemInput(index-1, 'endTime');

                            if(this._duration(datasets[index-1].startTime, dataset.startTime)<=0){

                                alert('You cannot set the start time earlier than that of the previous activity');
                                inputStart.value=datasets[index-1].endTime;
                                this._scheduleRedraw();
                                return;

                            }

                            inputEnd.value=dataset.startTime
                            this._scheduleRedraw();
                            return;
                        }


                        shouldBreak=true;
                        //var inputStart=this._list.getItemInput(index, 'startTime');
                        var calcCurrentDuration=this._duration(dataset.startTime, dataset.endTime);
                        inputStart.value=datasets[index-1].endTime;
                        var preserveDuration=true;
                        if(preserveDuration){
                            var inputEnd=this._list.getItemInput(index, 'endTime');
                            inputEnd.value=this._addOffset(datasets[index-1].endTime, calcCurrentDuration);
                        }

                        this._scheduleRedraw();
                        return;


                    }

                }


            }


            


            var duration=this._duration(dataset);
            if(duration<=0){
                shouldBreak=true;
                var endTime=this._list.getItemInput(index, 'endTime');


                if(endTime===document.activeElement){
                    this._delayUpdate(endTime);
                    return;
                }


                endTime.value=this._addOffset(dataset.startTime, this._minDuration);
                this._scheduleRedraw();;
                return;
            }


        });

        if(this._needsRedraw===true){
            this._redraw();
            return;
        }


        this._addAppend()

        this._element.appendChild(new Element('span',{
         "class":"outro"
        }));
        
        delete this._isRendering;

    }
    _scheduleRedraw(){
        this._needsRedraw=true;
        this._list.needsUpdate();
        if(!this._isRendering){
            setTimeout(()=>{
                this._redraw();
            }, 10);
        }
    }

    _formatDuratation(minutes){
        return (new Calc()).formatDuratation(minutes);
    }
    
    _formatTime(str){
        return (new Calc()).formatTime(str);
    }

    _delayUpdate(input){
        var delayUpdateFn=()=>{
           this._list.needsUpdate();
        };
        var removeListener=()=>{
             input.removeEventListener('blur', delayUpdateFn);
        }
        input.addEventListener('blur', delayUpdateFn);
    }

    _canHaveTravelTime(index, dataset, datasets){
         return index>0&&datasets[index-1].locationType!==dataset.locationType;   
    }

    _addTransitIndicators(item, index, dataset, datasets){

        if(index>0&&datasets[index-1].locationType!==dataset.locationType){
            item.appendChild(new Element('div', {
                "class":"transit"
            }));
        }

    }


    _addActivityLabel(item, index, dataset){

        var activityOpt=null;
        if(dataset.locationType==="0"){
            activityOpt=this._list.getItemInput(index, 'inHomeActivity');
        }
        if(dataset.locationType==="1"){
            activityOpt=this._list.getItemInput(index, 'workActivity');
        }
        if(dataset.locationType==="2"){
            activityOpt=this._list.getItemInput(index, 'otherActivity');
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

    _durationToHeight(d){
        
        return Math.round(d/15)*10;
    }

    _heightToDuration(h){
        return Math.round(h/10)*15;
    }

    _addDurationIndicators(item, index, dataset, datasets){

        var duration=this._duration(dataset);
        item.dataset['duration']=duration;


        var durationEl=item.appendChild(new Element('div', {
            "class":"duration"
        }))

        var durationHeight=this._durationToHeight(duration); //Math.round(duration/15)*10;
        durationEl.style.cssText = '--durationHeight:'+durationHeight+"px;";


        if(index>0&&datasets[index-1].locationType!==dataset.locationType){

            var travelDuration=this._duration(datasets[index-1].endTime, dataset.startTime);

            var travelDurationEl=item.appendChild(new Element('div', {
                "class":"travel-duration"
            }));

            travelDurationEl.dataset['travel']=travelDuration;

            if(travelDuration>60){
                var hourDur=Math.floor(travelDuration/60)+"h";
                if(travelDuration%60>0){
                    hourDur+=" "+(travelDuration%60)+"m";
                }
                travelDurationEl.dataset['travelHr']=hourDur;
            }

        }

    }

    _duration(startTime, endTime){
         var _valueOf=(value)=>{

            var h=parseInt(value.split(':').shift());
            var m=parseInt(value.split(':').pop());

            var num=h*60+m;

            if(isNaN(num)){
                return 0;
            }

            return num;
        }

        var dataset=startTime;

        if(typeof startTime=='string'&&typeof endTime=='string'){
             dataset={
                 startTime:dataset,
                 endTime:endTime
             };
        }


        var start=_valueOf(dataset.startTime);
        var end=_valueOf(dataset.endTime);

        if(start>end){
            console.log('overflows day');
            end+=24*60;
        }

        // if(start>12*60&&end<5*60){
        //     // overflow the current day
        //     end+=24*60;
        // }

        return end-start;
    }

    _addDragTimeHandles(item, index, dataset, datasets){


        

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
            container:this._element
        });

        itemEndHandle.addEventListener('dragNdrop:start', ()=>{
            item.classList.add('resizing');
            item.parentNode.classList.add('rs');
        });


        var _y=0;
        var _d=0;


        var durationEl=item.querySelectorAll(".duration")[0];

        itemEndHandle.addEventListener('dragNdrop:drag', ()=>{
            
            //z-index: 1000; cursor: row-resize; transform: translate3d(0px, 47px, 1px);
            var offsets=itemEndHandle.style.cssText.split('translate3d(').pop().split(')').shift().split(',');
            var y=parseInt(offsets[1]);

            var snap=this._minDuration;
            var snapPixels=this._durationToHeight(snap);

            var height=Math.floor(y/snapPixels)*snapPixels;
            y=height;
            var d=this._heightToDuration(height);

            console.log(y+"->"+d);


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

            var endTime=this._list.getItemInput(index, 'endTime');
            endTime.value=this._snapOffsetEnd(dataset.endTime, _d, this._minDuration);
            this._scheduleRedraw();

            _y=0;

        });


    }
    _clearDraggingStyles(item){
        item.classList.remove('resizing');
        item.classList.remove('rs-neg');
        item.parentNode.classList.remove('rs');
        item.style.cssText='';
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

        item.style.cssText='--resizeHeight:'+y+'px; --addDuration: "'+this._formatDuratation(dur)+'"; --dragEndTime: "'+this._formatTime(end)+'";';
        
    }

}