import  { EventEmitter } from  'events';
import  { Element } from  './Element.js';
import  { Calc } from  './Calc.js';

import  { ScheduleItem } from  './ScheduleItem.js';

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
        this._items=[];

        // This is already added in index.html for my survey
        // list.setDatasetKeyFormatter(function(key){
        //    return key.replace(/\d+$/, "") //strip trailing numbers
        // });
        
        this._list.autoValidate();
        
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






        var inputStart=this.getItemInput(index, 'startTime');
        var inputEnd=this.getItemInput(index, 'endTime');


        if(_isEmpty(inputStart)){

            if(index>0){
                var lastEnd=this.getItemInput(index-1, 'endTime');
                inputStart.value=lastEnd.value;
            }else{
               
               inputStart.value="04:00"; 
               inputStart.classList.add('disabled');
               if(inputEnd.value===""){
                   inputEnd.value="06:30";
               }

            }

            
        }


        var inputLocation=this.getItemInput(index, 'locationType');

        if(_isEmpty(inputLocation)){

            if(index==0){

                inputLocation.value="0";
                var inputHomeActivity=this.getItemInput(index, 'inHomeActivity');
                if(_isEmpty(inputHomeActivity)){
                    inputHomeActivity.value="0";
                }
            }else{

                var inputLastLocation=this.getItemInput(index-1, 'locationType');
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


    insertItem(index){
        this._list.insertItem(index);
    }

    appendItem(){
        this._list.addItem();
    }


    setCurrentIndex(index){
        this._list.setCurrentIndex(index);
        var item=this._items[index].getElement();
        item.classList.add("active");
        if(this._active){
            this._active.classList.remove("active");
        }
    }


    getItemElement(index){
        return this._list.getItemElement(index);
    }


    getItemInput(index, fieldName){
        return this._list.getItemInput(index, fieldName);
    }
    

    _redraw(){
        this._isRendering=true;
        // this._empty();
        this._needsRedraw=false;

        this._addIntro()
        

        var currentIndex=this._list.getCurrentIndex();
        this._active=null;

        var datasets=this._list.getItemsData();

        var shouldBreak=false;

        while(this._items.length>datasets.length){
            var removedScheduleItem=this._items.pop();
            removedScheduleItem.remove();
        }
        
        datasets.forEach((dataset, index)=>{

            var preserveDuration=true;

            if(shouldBreak){
                return;
            }
           
            var item;
            var scheduleItem;
            if(this._items.length>index){
                scheduleItem=this._items[index];
                item=scheduleItem.update(index, dataset, datasets);

            }else{
                scheduleItem=new ScheduleItem(this._element, this);
                item=scheduleItem.create(index, dataset, datasets);
                this._items.push(scheduleItem);
            }
            
            

            if(currentIndex===index){
                item.classList.add("active");
                this._active=item;
            }
		


            if(currentIndex===index){

                if(this._lastValidDatasets){
                    if(this._isEditing(index, 'startTime')){
                        if(preserveDuration&&this._lastValidDatasets){
                            this._restoreLastDuration(index, datasets)
                        }
                        this._delayUpdate(index, 'startTime');
                        return;
                    }

                    if(this._isEditing(index, 'endTime')){
                        shouldBreak=true;
                        this._delayUpdate(index, 'endTime');
                        return;
                    }
                }
            }

            if(index==0){
                if(this._clampDuration(index, datasets, this._minDuration, 16*60)){
                    shouldBreak=true;
                    this._scheduleRedraw();
                    return;
                }
            }


            if(this._canHaveTravelTime(index, dataset, datasets)){
                var travelDuration=this._duration(datasets[index-1].endTime, dataset.startTime);

                if(isNaN(travelDuration)){
                    throw 'Invalid travel duration';
                }

                if(travelDuration<=0){
                    shouldBreak=true;

                    this._clampStartTimeToPrevious(index, this._minDuration, datasets)
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

                        if(currentIndex!=index){


                             shouldBreak=true;
                            //var inputStart=this.getItemInput(index, 'startTime');
                        
                            var newStartTime=this._clampStartTimeToPrevious(index, 0, datasets);
                            
                            if(preserveDuration){
                                this._preserveDuration(index, newStartTime, datasets);
                            }

                            this._scheduleRedraw();
                            return;
                        }
                            

                        /**
                         * if setting time to PM from AM then it 
                         * 
                         * if {n}.startTime < {n-1}.startTime then 
                         */


                        shouldBreak=true;

                        if(this._isEditing(index, 'startTime')){
                            if(preserveDuration&&this._lastValidDatasets){
                                this._restoreLastDuration(index, datasets)
                            }
                            this._delayUpdate(index, 'startTime');
                            return;
                        }

                        

                        if(this._duration(datasets[index-1].startTime, dataset.startTime)<=0){

                            alert('You cannot set the start time earlier than that of the previous activity');
                            this._clampStartTimeToPrevious(index, 0, datasets)
                            this._scheduleRedraw();
                            return;

                        }

                        this._clampPreviousEndTimeToCurrent(index, 0, datasets)
                        this._scheduleRedraw();
                        return;
                        


                       


                    }

                }


            }


            var duration=this._duration(dataset);
            if(duration<=0){
                shouldBreak=true;
                this._adjustEmptyItem(index);
                return;
            }


        });

        if(this._needsRedraw===true){
            this._redraw();
            return;
        }

        this._addOutro();
        

        delete this._isRendering; 
        
        if(this._needsDelayUpdate){
            return;
        }
        
        // keep last valid
        this._lastValidDatasets=JSON.parse(JSON.stringify(datasets));

    }

    _adjustEmptyItem(index){

        var preserveDuration=true;

        if(this._isEditing(index, 'endTime')){
            //will need to adjust 
            this._delayUpdate(index, 'endTime');
            return;
        }

        if(preserveDuration&&this._lastValidDatasets){
            this._restoreLastDuration(index, datasets)
        }else{
            this._clampMinDuration(index, datasets);
        }
        this._scheduleRedraw();
    }

    _isEditing(index, field){
        var input=this.getItemInput(index, field);
        return input===document.activeElement
    }

    _clampPreviousEndTimeToCurrent(index, travelTime, datasets){

        var inputEnd=this.getItemInput(index-1, 'endTime');
        var newEndTime=this._addOffset(datasets[index].startTime, -travelTime);
        inputEnd.value=newEndTime;
        return newEndTime;
    }

    _clampStartTimeToPrevious(index, travelTime, datasets){
        
        var inputStart=this.getItemInput(index, 'startTime');
        var newStartTime=this._addOffset(datasets[index-1].endTime, travelTime);
        inputStart.value=newStartTime;
        return newStartTime;
    }

    _preserveDuration(index, startTime, datasets){
        var inputEnd=this.getItemInput(index, 'endTime');
        var duration=this._duration(datasets[index]);
        inputEnd.value=this._addOffset(startTime, duration);
    }


    _clampDuration(index, datasets, min, max){
       
        var duration=this._duration(datasets[index]);
        var newDuration=Math.max(min, Math.min(duration, max));
        if(newDuration!==duration){
            var newEndTime=this._addOffset(datasets[index].startTime, newDuration);
            var inputEnd=this.getItemInput(index, 'endTime');
            inputEnd.value=newEndTime;
            return true;
        }
        return false;
        
    }

    _clampMinDuration(index, datasets){

        var inputEnd=this.getItemInput(index, 'endTime');
        inputEnd.value=this._addOffset(datasets[index].startTime, this._minDuration);
    }

    _restoreLastDuration(index, datasets){
        var lastDuration=this._duration(this._lastValidDatasets[index]);
        // var currentDuration=this._duration(dataset);
        var inputEnd=this.getItemInput(index, 'endTime');
        inputEnd.value=this._addOffset(datasets[index].startTime, lastDuration);
    }
    

    needsRedraw(){
        this._scheduleRedraw();
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


    _delayUpdate(input, field){

        if(typeof input=='number'&&field){
            input=this.getItemInput(input, field);
        }

        this._needsDelayUpdate=true;
        if(this._removeBlurListener){
            this._removeBlurListener();
        }
        var delayUpdateFn=()=>{
           setTimeout(()=>{
                delete this._needsDelayUpdate;
                this._list.needsUpdate();
                if(this._removeBlurListener){
                    this._removeBlurListener();
                }
            }, 20);
        };
        this._removeBlurListener=()=>{
             input.removeEventListener('blur', delayUpdateFn);
             delete this._removeBlurListener;
        }
        
        input.addEventListener('blur', delayUpdateFn);
    }

    _canHaveTravelTime(index, dataset, datasets){
         return index>0&&datasets[index-1].locationType!==dataset.locationType;   
    }


    _duration(startTime, endTime){
        return (new Calc()).duration(startTime, endTime);
    }


    _addIntro(){
        if(!this._intro){
            this._intro=this._element.appendChild(new Element('span',{
                "class":"intro"
            }));
        }
    }
    _addOutro(){
        if(!this._outro){
            this._outro=this._element.appendChild(new Element('span',{
                "class":"outro"
            }));
        }

        if(this._outro.nextSibling){
            // move to end
            this._element.appendChild(this._outro);
        }

    }

}