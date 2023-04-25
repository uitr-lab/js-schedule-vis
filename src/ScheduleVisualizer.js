import  { EventEmitter } from  'events';
import  { Element } from  './Element.js';

export class ScheduleVisualizer extends EventEmitter {

	constructor(list){
		super();

        this._list=list;


        this._element=list.getElement().parentNode.insertBefore(new Element('div', {
            "class":"schedule-vis"
        }), list.getElement());


        this._element.parentNode.removeChild(this._element.previousSibling);
        this._list.on('update', ()=>{
            this._redraw();
        });

        this._redraw();
	}


    _redraw(){

        this._element.innerHTML='';

        var currentIndex=this._list.getCurrentIndex();
        this._active=null;

        this._list.getItemsData().forEach((dataset, index)=>{
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

        })


    }


}