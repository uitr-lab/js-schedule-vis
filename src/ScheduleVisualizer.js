import  { EventEmitter } from  'events';
import  { Element } from  './Element.js';


import * as dragNdrop from 'npm-dragndrop/src/dragNdrop.js';


/**
 * This is specific to the UiTR Transit lab survey
 */

export class ScheduleVisualizer extends EventEmitter {

	constructor(list){
		super();

        this._list=list;


        // This is already added

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
            this._redraw();
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
               
               inputStart.value="03:00"; 
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

            inputEnd.value=this._offsetEnd(inputStart.value, 30);

        }


        this._list.needsUpdate();

    }

    _offsetEnd(value, addOffset){

        var _pad=(n)=>{
            n=n+"";
            if(n.length==1){
                return "0"+n;
            }
            return n;
        };

        var m=(parseInt(value.split(':').shift())*60)+parseInt(value.split(':').pop());
        m=(Math.round(m/addOffset)*addOffset)+addOffset;

       return _pad(Math.floor(m/60))+':'+_pad(m%60);

    }



    _redraw(){

        this._element.innerHTML='';

        var currentIndex=this._list.getCurrentIndex();
        this._active=null;

        var datasets=this._list.getItemsData();

        var shouldBreak=false;

        datasets.forEach((dataset, index)=>{

            if(shouldBreak){
                return;
            }

            var item=this._element.appendChild(new Element('div', {
                "class":"schedule-item"+(currentIndex===index?" active":""),
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

            if(currentIndex===index){
                item.classList.add("active");
                this._active=item;
            }
		
			Object.keys(dataset).forEach((key)=>{
				item.dataset[key]=dataset[key];
			});



            this._addTransitIndicators(item, index, dataset, datasets);
            this._addDurationIndicators(item, index, dataset, datasets);
            this._addActivityLabel(item, index, dataset);
            this._addDragTimeHandles(item, index, dataset, datasets);


           



            if(this._hasTravel(index, dataset, datasets)){
                var travelDuration=this._duration(datasets[index-1].endTime, dataset.startTime);
                if(travelDuration<=0){
                    shouldBreak=true;
                    var inputStart=this._list.getItemInput(index, 'startTime');
                    inputStart.value=this._offsetEnd(datasets[index-1].endTime, 15);
                    this._list.needsUpdate();
                    return;
                }
            }else{

                /**
                 * Should not allow any travel duration.
                 */

                if(index>0){

                    var travelDuration=this._duration(datasets[index-1].endTime, dataset.startTime);
                    if(travelDuration!==0){

                        // Snap {n-1}.endTime to {n}.startTime
                        // can either move {n-1}.endTime, or {n}.startTime

                        var calcPreviousDuration=this._duration(datasets[index-1].startTime, dataset.startTime);
                        
                        

                        if(currentIndex==index){

                            

                            /**
                             * if setting time to PM from AM then it 
                             * 
                             * if {n}.startTime < {n-1}.startTime then 
                             */




                            shouldBreak=true;
                            var inputEnd=this._list.getItemInput(index-1, 'endTime');
                            inputEnd.value=dataset.startTime
                            this._list.needsUpdate();
                            return;
                        }


                        shouldBreak=true;
                        var inputStart=this._list.getItemInput(index, 'startTime');
                        inputStart.value=datasets[index-1].endTime
                        this._list.needsUpdate();
                        return;


                    }

                }


            }


            var duration=this._duration(dataset);
            if(duration<=0){
                shouldBreak=true;
                var endTime=this._list.getItemInput(index, 'endTime');
                endTime.value=this._offsetEnd(dataset.startTime, 15);
                this._list.needsUpdate();
                return;
            }


        });


    }

    _hasTravel(index, dataset, datasets){
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

        }

    }

    _duration(startTime, endTime){
         var _valueOf=(value)=>{

            var h=parseInt(value.split(':').shift());
            var m=parseInt(value.split(':').pop());

            return h*60+m;

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

        dragNdrop({
            element:itemEndHandle,
            constraints:'y',
            callback: (event) =>{
                event.element.style.cssText = '';
            }
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

            var height=Math.floor(y/15)*15;
            y=height;
            var d=this._heightToDuration(height);

            


            if(y!=_y&&(!isNaN(y))){

                _y=y;
                _d=d;
                console.log(y);

                item.style.cssText='--resizeHeight:'+_y+'px; --addDuration: "'+_d+'";';
                if(_d<0){
                    item.classList.add('rs-neg');
                }else{
                    item.classList.remove('rs-neg');
                }
            }
        });

        itemEndHandle.addEventListener('dragNdrop:stop', ()=>{
            item.classList.remove('resizing');
            item.classList.remove('rs-neg');
            item.parentNode.classList.remove('rs');
            item.style.cssText='';
            console.log(_y);

            var endTime=this._list.getItemInput(index, 'endTime');
            endTime.value=this._offsetEnd(dataset.endTime, _d);
            this._list.needsUpdate();

            _y=0;


        });

    }

}