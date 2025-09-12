import  { EventEmitter } from  'events';
import  { Element } from  './Element.js';
import  { Calc } from  './Calc.js';

import  { ScheduleItem } from  './ScheduleItem.js';
import  { ScheduleProgressBar } from  './ScheduleProgressBar.js';


ScheduleProgressBar

import * as dragNdrop from 'npm-dragndrop/src/dragNdrop.js';


/**
 * This is specific to the UiTR Transit lab survey
 */

export class ScheduleVisualizer extends EventEmitter {

	constructor(list){
		super();

        this._minDuration=15;
        this._minTravelTime=15;
        this._initialItem={

        };

        this._list=list;
        this._items=[];

        this._active=null;

        // This is already added in index.html for my survey
        // list.setDatasetKeyFormatter(function(key){
        //    return key.replace(/\d+$/, "") //strip trailing numbers
        // });

        this._navigationEnabled=true;
        this._list.autoValidate();
        this._list.on('validation', ()=>{
            this._enableNavigation();
        })

        this._list.on('failedValidation', ()=>{
            console.log('failed')
            this._disableNavigation();
        })
        
        this._list.on('addItem', (item, index)=>{
            item=this._checkPrediction(item, index)
            this._setTimes(item, index);
        });
            
        this._list.getItems().forEach(this._setTimes.bind(this));



        this._element=list.getElement().parentNode.insertBefore(new Element('div', {
            "class":"schedule-vis"
        }), list.getElement());

        
        this._element.parentNode.removeChild(this._element.previousSibling);     
        this._list.on('update', ()=>{
            try{
                this._formatActivities();
            }catch(e){
                console.error(e);
            }
        });


        this._list.on('select', (i)=>{
            this.emit('select', i);
        });

        this._list.getPage().addValidator((formData, pageData, opts)=>{
            return new Promise((resolve)=>{
                if(this.calcFullDurationTo(this._lastValidDatasets.length)>20*60){
                    resolve();
                    return;
                }
                throw {errors:['Need to complete a full day'], fields:['activitySchedule']};
            })
        })
        this._updateSidebar();
        this._formatActivities();
        this.on('update', ()=>{
            this._updateSidebar();
        });

        (new ScheduleProgressBar(list.getElement(), this));
        

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

        if(!this._navigationEnabled){
            this._navigationFailedFeedback(index);
            return
        }
     
        this._list.insertItem(index);
        
    }

    appendItem(){

        if(!this._navigationEnabled){
            this._navigationFailedFeedback(index);
            return
        }
        
        this._list.addItem();
        
    }


    setCurrentIndex(index){

        if(!this._navigationEnabled){
            this._navigationFailedFeedback(index);
            if(this._list.isIndexValid(index)){
                // allow user to go to invalid indexes!
                return
            }
            
        }
        
        this._setCurrentIndex(index);
        
    }

    _setCurrentIndex(index){
        this._list.setCurrentIndex(index);
        var item=this._items[index].getElement();
        item.classList.add("active");
        if(this._active&&this._active!==item){
            this._active.classList.remove("active");
        }
        this._active=item;
    }


    getItemElement(index){
        return this._list.getItemElement(index);
    }


    getItemInput(index, fieldName){
        return this._list.getItemInput(index, fieldName);
    }

    getCurrentIndex(){
        return this._list.getCurrentIndex();
    }
    

    _updateSidebar(){

        this._addIntro()
        
        var datasets=this._list.getItemsData();

        while(this._items.length>datasets.length){
            var removedScheduleItem=this._items.pop();
            removedScheduleItem.remove();
        }
        
        datasets.forEach((dataset, index)=>{



           
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
            
            
            if(this.getCurrentIndex()===index){
                this._setCurrentIndex(index);
            }
        });


        this._addOutro();
    }

    _formatActivities(){
        this._isRendering=true;
        // this._empty();
        this._needsRedraw=false;

        

        

        var datasets=this._list.getItemsData();
        this._changedAnyItem=false;
        
        datasets.forEach((dataset, index)=>{

            var preserveDuration=true;

            if(this._changedAnyItem){
                return;
            }
        

            /*
             * Adjust activity times
             */
		


            if(this.getCurrentIndex()===index){

                if(this._lastValidDatasets){
                    if(this._isEditing(index, 'startTime')){


                        this._autoSwitchAmPMStartTime(index, dataset, datasets);

                        if(preserveDuration&&this._lastValidDatasets){
                            this._restoreLastDuration(index, datasets)
                        }
                        this._changedAnyItem=true;
                        this._delayUpdate(index, 'startTime');
                        return;
                    }

                    if(this._isEditing(index, 'endTime')){

                        this._autoSwitchAmPMEndTime(index, dataset, datasets);

                        this._changedAnyItem=true;
                        this._delayUpdate(index, 'endTime');
                        return;
                    }
                }
            }

            if(index==0){
                if(this._clampDuration(index, datasets, this._minDuration, 16*60)){
                    this._changedAnyItem=true;
                    this._scheduleRedraw();
                    return;
                }
            }

            var duration=this._duration(dataset);
            if(duration<=0){
                this._changedAnyItem=true;
                this._adjustEmptyItem(index, datasets);
                return;
            }


            if(this.canHaveTravelTime(index, datasets)){
                var travelDuration=this._duration(datasets[index-1].endTime, dataset.startTime);

                if(isNaN(travelDuration)){
                    throw 'Invalid travel duration';
                }

                if(travelDuration<=0){
                    this._changedAnyItem=true;

                    this._clampStartTimeToPrevious(index, this._minDuration, datasets)
                    this._scheduleRedraw();
                    return;
                }

                if(this.getCurrentIndex()<index&&this._lastValidDatasets){

                    var lastTravelTime=this._duration(this._lastValidDatasets[index-1].endTime, this._lastValidDatasets[index].startTime);
                    var newStartTime=this._clampStartTimeToPrevious(index, Math.max(lastTravelTime, this._minTravelTime), datasets);
                    
                    if(newStartTime!==dataset.startTime){
                    
                        if(preserveDuration){
                            this._preserveDuration(index, newStartTime, datasets);
                        }
                        this.emit('autoresize', index);
                        this._scheduleRedraw();
                        return;

                    }


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

                        if(this.getCurrentIndex()!=index){


                             this._changedAnyItem=true;
                           
                            
                           
                        
                            var newStartTime=this._clampStartTimeToPrevious(index, 0, datasets);
                            
                            if(newStartTime!==dataset.startTime){
                            
                                if(preserveDuration){
                                    this._preserveDuration(index, newStartTime, datasets);
                                }
                                this.emit('autoresize', index);
                                this._scheduleRedraw();
                                return;

                            }
                        }
                            

                        /**
                         * if setting time to PM from AM then it 
                         * 
                         * if {n}.startTime < {n-1}.startTime then 
                         */


                        this._changedAnyItem=true;

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


            


            /*
             * End of - adjust actvity times
             */


        });

        if(this._needsRedraw===true){
            this._formatActivities();
            return;
        }

        this._addOutro();
        

        delete this._isRendering; 
        
        if(this._needsDelayUpdate){
            return;
        }
        
        // keep last valid
        var lastValid=JSON.parse(JSON.stringify(datasets));
        if(JSON.stringify(this._lastValidDatasets)!==JSON.stringify(lastValid)){
            this._lastValidDatasets=lastValid;
            this.emit('update', lastValid);
            this._list.needsUpdate();
        }
        
    }


    calcFullDurationTo(index, datasets){


        if(!datasets){
            datasets=this._lastValidDatasets;
        }

        if(index==0){
            return 0;
        }

        var total=this._duration(datasets[0])
        for(var i=1;i<Math.min(datasets.length, index);i++){
            total+=this._duration(datasets[i-1].endTime, i+1==datasets.length?datasets[i].endTime:datasets[i+1].startTime);
        }
        return total;

    }

    calcDurationOf(index, datasets){


        if(!datasets){
            datasets=this._lastValidDatasets;
        }

        return this._duration(datasets[index].startTime, datasets[index].endTime);

    }

    calcTravelTimeOf(index, datasets){


        if(!datasets){
            datasets=this._lastValidDatasets;
        }

        if(index==0){
            return 0;
        }

        this._duration(datasets[index-1].endTime, datasets[index].startTime);

    }



    _autoSwitchAmPMStartTime(index, dataset, datasets){

        var switchedStartTime=this._addOffset(dataset.startTime, 12*60);
        if(parseInt(switchedStartTime.split(':').shift())>23){
            switchedStartTime=this._addOffset(switchedStartTime, -24*60);
        }


        var changedBy=(this._duration(this._lastValidDatasets[index].startTime, dataset.startTime))/60;
        if(changedBy==12){
            //user adjusted AM PM manually
            return;
        }


        var currentPreviousBlock=this._duration(datasets[index-1].startTime, dataset.startTime)/60
        var switchedPreviousBlock=this._duration(datasets[index-1].startTime, switchedStartTime)/60
        var lastPreviousBlock=this._duration(this._lastValidDatasets[index-1].startTime, this._lastValidDatasets[index].startTime)/60
        

        var currentChange=currentPreviousBlock-lastPreviousBlock;
        var switchedChange=switchedPreviousBlock-lastPreviousBlock;


        if(switchedChange<currentChange){
            this.getItemInput(index, 'startTime').value=switchedStartTime;
        }

    }

    _autoSwitchAmPMEndTime(index, dataset, datasets){
        
        
        var switchedEndTime=this._addOffset(dataset.endTime, 12*60);
        if(parseInt(switchedEndTime.split(':').shift())>23){
            switchedEndTime=this._addOffset(switchedEndTime, -24*60);
        }


        var changedBy=(this._duration(this._lastValidDatasets[index].endTime, dataset.endTime))/60;
        if(changedBy==12){
            //user adjusted AM PM manually
            return;
        }


        var currentDuration=this._duration(dataset.startTime, dataset.endTime)/60
        var switchedDuration=this._duration(dataset.startTime, switchedEndTime)/60
        var lastDuration=this._duration(this._lastValidDatasets[index].startTime, this._lastValidDatasets[index].endTime)/60
        

        var currentChange=currentDuration-lastDuration;
        var switchedChange=switchedDuration-lastDuration;

        
        if(switchedChange<currentChange){
            this.getItemInput(index, 'endTime').value=switchedEndTime;
        }

    }

    _adjustEmptyItem(index, datasets){

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
        var inputStart=this.getItemInput(index, 'startTime');
        inputEnd.value=this._addOffset(inputStart.value/*datasets[index].startTime*/, lastDuration);
    }
    

    needsRedraw(){
        this._scheduleRedraw();
    }
    _scheduleRedraw(){
        this._needsRedraw=true;
        this._list.needsUpdate();
        if(!this._isRendering){
            setTimeout(()=>{
                this._formatActivities();
            }, 10);
        }
    }

    needsRedrawOnDragend(){

        var alertResize=()=>{

            alert('Some activities start and end dates have been automatically adjusted');

        };

        this.once('autoresize', alertResize);
        this.once('update', ()=>{
            this.off('autoresize', alertResize);
        });

        this.needsRedraw();
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

    canHaveTravelTime(index, datasets){

        if(!datasets){
            datasets=this._lastValidDatasets;
        }

        if(index==0){
            return false;
        }

        if(datasets[index-1].locationType!==datasets[index].locationType){
            return true;
        }

        if(datasets[index].locationOtherAddress&&
            datasets[index-1].locationOtherAddress!==datasets[index].locationOtherAddress){

            return true;
        }


        

        return false;
    }
    
    getActivityProbability(index, datasets){
        const name=this.getActivityName(index, datasets);
        const formData=this._list.getPage().getFormData();

        if(typeof formData._activity[name] =='undefined'){
            throw `Missing probability for: ${name}`;
        }

        const data= {
            name:name,
            p:formData._activity[name].map((f)=>{return parseFloat(f);}),
            value:this._duration(datasets[index])
        };

        data.status='ok';

        if(data.value<data.p[0]){
            data.status='less-than-normal'
        }
        if(data.value>data.p[1]){
            data.status='greator-than-normal'
        }

        return data;
    }


    getActivityLocation(index, datasets){
        if(!datasets){
            datasets=this._lastValidDatasets;
        }
        const dataset=datasets[index];
        const categories=[
            'home',
            'work-school',
            'other'
        ];

        const cat=categories[parseInt(dataset.locationType)];
        return cat;
    }

    getActivityName(index, datasets){
        if(!datasets){
            datasets=this._lastValidDatasets;
        }
       
        const cat=this.getActivityLocation(index, datasets);
        const formData=this._list.getPage().getFormData();
        const values=formData._config.activity[cat]

        const fields=[
            'inHomeActivity',
            'workActivity',
            'otherActivity'
        ];
        const dataset=datasets[index];
        const field=fields[parseInt(dataset.locationType)];

        const activity= values[parseInt(dataset[field])];
        
        return activity;

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


    _enableNavigation(){
        this._navigationEnabled=true;
        this._element.classList.remove('disable-nav');

    }
    _disableNavigation(){
        this._navigationEnabled=false;
        this._element.classList.add('disable-nav');
    }


    _navigationFailedFeedback(){
        this._list.showErrors();
        
    }


    _checkPrediction(item, index){

        if(index<1 || !this._prediction){
            return item;
        }

        var predictionIndex=index;
        if(predictionIndex>=this._prediction.length){
            return item;
        }

        try{

            var lastPrediction=this._prediction[predictionIndex-1];
            var thisPrediction=this._prediction[predictionIndex];

            

            var locationType=this.getActivityLocation(index-1);
            var inputEnd=this.getItemInput(index-1, 'endTime').value;
            var activity=this.getActivityName(index-1);

            var map={
                "work":"working",
                "school":"attending class"
            };
            var replacements={
                        "in-home":"in - home",
                        'in - home recreation and exercise':'in - home recreation'
                    };

            var _map=(val)=>{
                Object.keys(map).forEach((k)=>{
                    if(val==k){
                        val=map[k];
                    }
                })
                Object.keys(replacements).forEach((k)=>{
                    val=val.replace(k, replacements[k]);
                })
                return val;
            };


            var lastPredictedActivity=_map(lastPrediction.Activity.split('_').shift().toLowerCase());

            if(activity.toLowerCase().indexOf(lastPredictedActivity)>=0){

                var timeDelta=(new Calc()).delta(lastPrediction.End, inputEnd);
                if(Math.abs(timeDelta)<120){
                    //use prediction
                    console.log('use prediction')


                    // merge predicted time with actual time...
                    timeDelta=timeDelta/2;
                    if(timeDelta<30){
                        timeDelta=0
                    }
                    
                   
                    var predictedActivity=_map(thisPrediction.Activity.split('_').shift().toLowerCase());
                   

                    const fields=[
                        'inHomeActivity',
                        'workActivity',
                        'otherActivity'
                    ];

                    for(var i=0;i<fields.length;i++){
                        var field=fields[i];
                        var inputActivities=this.getItemInput(index, field);
                        var options=Array.from(inputActivities.options);
                        for(var j=0;j<options.length;j++){
                            var option=options[j]
                            var value=option.innerText;

                            if(value.toLowerCase().indexOf(predictedActivity)>=0){
                                console.log('use value');
                                this.getItemInput(index, 'locationType').value=`${i}`;
                                inputActivities.value=`${j-1}`;

                                var inputEnd=this.getItemInput(index, 'endTime')
                                inputEnd.value=this._snapOffsetEnd(thisPrediction.End, timeDelta, 5);

                                return item;
                            }
                        }
                    }

                }

            }

        }catch(e){
            console.error(e);
        }

        return item;
    }



    setPrediction(data){

        if(data.status=='Ok'){
            this._prediction=data.response;
        }
        
    }

}