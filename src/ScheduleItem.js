
import { Calc } from './Calc.js';
import { Element } from './Element.js';
import * as dragNdrop from 'npm-dragndrop/src/dragNdrop.js';

import { BellCurve } from './helpers/BellCurve.js';

export class ScheduleItem {

    constructor(element, visualizer) {
        this._container = element;
        this._visualizer = visualizer;
        this._minDuration = 15;
    }

    getElement() {
        return this._item;
    }


    remove() {
        this._container.removeChild(this._item);


        if (this._insert) {
            this._container.removeChild(this._insert);
            delete this._insert;
        }

        if (this._append) {
            this._container.removeChild(this._append);
            delete this._append;
        }

        delete this._container;
        delete this._visualizer;
        delete this._dataset;
        delete this._datasets;

    }


    create(index, dataset, datasets) {

        this._vars = {}
        this._index = index;
        this._dataset = dataset;
        this._datasets = datasets;



        this._addInsert();


        this._item = this._container.appendChild(new Element('div', {
            "class": "schedule-item",
            "events": {
                "click": () => {
                    this._visualizer.setCurrentIndex(this._index);
                }
            }
        }));

        this._styleItem();

        this._addAppend();

        return this._item;
    }


    update(index, dataset, datasets) {

        this._vars = {}
        this._index = index;
        this._dataset = dataset;
        this._datasets = datasets;



        this._addInsert();



        var item = this._item;
        item.style.cssText = '';
        item.innerHTML = '';

        Object.keys(item.dataset).forEach((key) => {
            delete item.dataset[key];
        });



        this._styleItem();

        this._addAppend();

        return item;
    }

    _styleItem() {

        var item = this._item;
        var index = this._index;
        var dataset = this._dataset;
        var datasets = this._datasets;

        var itemElement = this._visualizer.getItemElement(index);

        Object.keys(dataset).forEach((key) => {
            item.dataset[key] = dataset[key];

            if (key.split('Time').pop() === '') {
                //ends with 'Time'
                if ((!dataset[key]) || dataset[key] === "") {
                    return; //incase empty value - avoid NAN
                }

                item.dataset[key + 'AmPm'] = this._formatTime(dataset[key]);
                itemElement.dataset[key + 'AmPm'] = this._formatTime(dataset[key]);
            }

        });

        if (this._visualizer.canHaveTravelTime(index, datasets)) {
            item.dataset['canHaveTravel'] = 'yes';
            itemElement.dataset['canHaveTravel'] = 'yes';
        } else {
            item.dataset['canHaveTravel'] = 'no';
            itemElement.dataset['canHaveTravel'] = 'no';
        }

        item.dataset['index'] = index;

        this._addTransitIndicators();
        this._addDurationIndicators();
        this._addActivityLabel();
        this._addDragTimeHandles();
        this._addProbabilityCurve();

        return item;
    }


    _addInsert() {

        if (this._index == 0) {

            if (this._insert) {
                this._container.removeChild(this._insert);
                delete this._insert;
            }
            return;
        }


        if (this._insert) {
            return;
        }



        this._insert = this._container.appendChild(new Element('button', {
            "html": "Insert Activity",
            "class": "add-item-btn insert-btn",
            events: {
                click: (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this._visualizer.insertItem(this._index);
                }
            }
        }));

        if (this._item) {
            this._container.insertBefore(this._insert, this._item);
        }
    }

    _addAppend() {

        if (this._index < this._datasets.length - 1) {
            if (this._append) {
                this._container.removeChild(this._append);
                delete this._append;
            }
            return;
        }


        if (this._append) {
            return;
        }

        this._append = this._container.appendChild(new Element('button', {
            "html": "Add Activity",
            "class": "add-item-btn",
            events: {
                click: (e) => {
                    e.stopPropagation();
                    e.preventDefault();

                    this._visualizer.appendItem();
                }
            }
        }));


        if (this._item && this._item.nextSibling && this._item.nextSibling !== this._append) {
            this._container.insertBefore(this._append, this._item.nextSibling);
        }

    }




    _addTransitIndicators() {

        var item = this._item;
        var index = this._index;
        var dataset = this._dataset;
        var datasets = this._datasets;

        if (this._visualizer.canHaveTravelTime(index, datasets)) {
            var transitEl = item.appendChild(new Element('div', {
                "class": "transit"
            }));

            var travelDuration = this._duration(datasets[index - 1].endTime, dataset.startTime);
            var travelDurationHeight = this._durationToHeight(travelDuration);
            transitEl.style.cssText = '--travelHeight:' + travelDurationHeight + "px;";




        }

    }

    _addDurationIndicators() {

        var item = this._item;
        var index = this._index;
        var dataset = this._dataset;
        var datasets = this._datasets;

        var duration = this._duration(dataset);
        item.dataset['duration'] = duration;





        var durationEl = item.appendChild(new Element('div', {
            "class": "duration"
        }))

        var durationHeight = this._durationToHeight(duration); //Math.round(duration/15)*10;
        //durationEl.style.cssText = '--durationHeight:'+durationHeight+"px;";
        durationEl.dataset['durationHr'] = this._formatDuration(duration);

        this._addVars({
            "durationHeight": durationHeight + "px"
        });

        if (this._visualizer.canHaveTravelTime(index, datasets)) {

            var travelDuration = this._duration(datasets[index - 1].endTime, dataset.startTime);
            var travelDurationHeight = this._durationToHeight(travelDuration);
            var travelDurationFmt = this._formatDuration(travelDuration);



            this._addVars({
                "travelHeight": travelDurationHeight + "px"
            });

            var travelDurationEl = item.appendChild(new Element('div', {
                "class": "travel-duration"
            }));

            var itemElement = this._visualizer.getItemElement(index);
            var travelDurationItemEl = itemElement.querySelector('.travel-duration');
            if (!travelDurationItemEl) {
                travelDurationItemEl = itemElement.insertBefore(new Element('div', {
                    "class": "travel-duration"
                }), itemElement.firstChild);

                travelDurationItemEl.appendChild(new Element('div', {
                    "class": "transit"
                }));

            }

            [travelDurationEl, travelDurationItemEl].forEach((el) => {

                //travelDurationEl.style.cssText = '--travelHeight:'+travelDurationHeight+"px;";

                el.dataset['travelStart'] = datasets[index - 1].endTime;
                el.dataset['travelEnd'] = datasets[index].startTime;
                el.dataset['travel'] = travelDuration;
                el.dataset['travelHr'] = travelDurationFmt;

            });
        }

    }

    _getActivityProbability(index, datasets) {
        return this._visualizer.getActivityProbability(index, datasets);
    }
    _getActivityName(index, datasets) {
        const name = this._visualizer.getActivityName(index, datasets);
        return name;
    }

    _addProbabilityCurve() {

        var item = this._item;
        var index = this._index;
        var dataset = this._dataset;
        var datasets = this._datasets;


        var itemElement = this._visualizer.getItemElement(index);
        var activityProbabilityEl = itemElement.querySelector('.activity-probability');

        let probability = false;
        if (index > 0 && typeof this._getActivityName(index, datasets) == 'string') {
            try {
                probability = this._getActivityProbability(index, datasets);
            } catch (e) {
                console.error(e);
            }
        }

        if (!probability) {
            delete this._bellCurve;
            if (activityProbabilityEl) {
                itemElement.removeChild(activityProbabilityEl);
            }
            return;
        }

        if (!activityProbabilityEl) {
            activityProbabilityEl = itemElement.appendChild(new Element('div', {
                "class": "activity-probability"
            }));

            const b = new BellCurve();
            this._bellCurve = b;
            activityProbabilityEl.appendChild(b.getElement());
            // b.drawBellCurve(probability.p[0], probability.p[1])
            // b.addPoint(probability.value);
            // b.addLabel(probability.value, (new Calc()).formatDuration(probability.value));
            b.addClass(probability.status);
            return;
        }

        const b = new BellCurve(activityProbabilityEl.firstChild);
        this._bellCurve = b;
        // b.drawBellCurve(probability.p[0], probability.p[1], activityProbabilityEl.firstChild);
        // b.addPoint(probability.value);
        // b.addLabel(probability.value, (new Calc()).formatDuration(probability.value));
        b.addClass(probability.status);

    }


    _updateProbability(duration) {
        if (this._bellCurve) {
            // this._bellCurve.addPoint(duration);
            // this._bellCurve.addLabel(duration, (new Calc()).formatDuration(duration));
        }
    }

    _addActivityLabel() {

        var item = this._item;
        var index = this._index;
        var dataset = this._dataset;

        var activityOpt = null;
        if (dataset.locationType === "0") {
            activityOpt = this._visualizer.getItemInput(index, 'inHomeActivity');
        }
        if (dataset.locationType === "1") {
            activityOpt = this._visualizer.getItemInput(index, 'workActivity');
        }
        if (dataset.locationType === "2") {
            activityOpt = this._visualizer.getItemInput(index, 'otherActivity');
        }

        if (activityOpt) {
            var selected = Array.prototype.slice.call(activityOpt.options, 0).filter((option) => {
                return option.value === activityOpt.value;
            });
            if (selected.length) {
                var label = selected[0].innerHTML;
                item.appendChild(new Element('div', {
                    "class": "activity"
                })).dataset['activity'] = label;
            }
        }


    }







    _addDragTimeHandles() {

        var item = this._item;
        var index = this._index;
        var dataset = this._dataset;
        var datasets = this._datasets;


        if (index > 0 && datasets[index - 1].locationType !== dataset.locationType) {

            /**
             * only adjust transit
             */

            var itemStartHandle = item.appendChild(new Element('div', {
                "class": "drag-start"
            }));


            dragNdrop({
                element: itemStartHandle,
                constraints: 'y',
                callback: (event) => {
                    event.element.style.cssText = '';
                }
            });

        }

        var itemEndHandle = item.appendChild(new Element('div', {
            "class": "drag-end"
        }));

        item.addEventListener('touchmove', (e) => {
            //e.preventDefault();
        })

        dragNdrop({
            element: itemEndHandle,
            constraints: 'y',
            callback: (event) => {
                event.element.style.cssText = '';
            },
            container: this._container
        });

        var currentDuration;

        itemEndHandle.addEventListener('dragNdrop:start', () => {
            item.classList.add('resizing');
            item.parentNode.classList.add('rs');
            currentDuration = this._duration(dataset);
        });


        var _y = 0;
        var _d = 0;





        itemEndHandle.addEventListener('dragNdrop:drag', () => {

            //z-index: 1000; cursor: row-resize; transform: translate3d(0px, 47px, 1px);
            var offsets = itemEndHandle.style.cssText.split('translate3d(').pop().split(')').shift().split(',');
            var y = parseInt(offsets[1]);

            var snap = this._minDuration;
            var mind = snap - currentDuration;
            var maxd = 10 * 60; //max 10hr activity

            var snapPixels = this._durationToHeight(snap);

            y = Math.floor(y / snapPixels) * snapPixels;
            var d = this._heightToDuration(y);

            console.log(y + "->" + d);

            d = Math.max(mind, Math.min(d, maxd));

            var miny = this._durationToHeight(mind);
            var maxy = this._durationToHeight(maxd);

            y = Math.max(miny, Math.min(y, maxy));

            if (y != _y && (!isNaN(y))) {

                _y = y;
                _d = d;
                console.log(y);
                var _end = this._snapOffsetEnd(dataset.endTime, d, snap);

                this._setDraggingStyles(item, _d, _y, _end);
                this._updateProbability(currentDuration + _d);
            }
        });

        itemEndHandle.addEventListener('dragNdrop:stop', () => {
            this._clearDraggingStyles(item)
            console.log(_y);

            var endTime = this._visualizer.getItemInput(index, 'endTime');
            endTime.value = this._snapOffsetEnd(dataset.endTime, _d, this._minDuration);
            this._visualizer.needsRedrawOnDragend();

            _y = 0;

        });


    }


    _clearDraggingStyles(item) {
        item.classList.remove('resizing');
        item.classList.remove('rs-neg');
        item.parentNode.classList.remove('rs');

        this._removeVars([
            "resizeHeight",
            "addDuration",
            "dragEndTime",
        ]);
    }

    _setDraggingStyles(item, dur, y, end) {

        var snap = this._minDuration;

        if (dur == 0) {
            item.classList.add('z-dur');

            item.classList.remove('dur-1');
            item.classList.remove('dur--1');
        } else if (dur == snap) {
            item.classList.add('dur-1');
            item.classList.remove('z-dur');
            item.classList.remove('dur--1');
        } else if (dur == -snap) {
            item.classList.add('dur--1');

            item.classList.remove('z-dur');
            item.classList.remove('dur-1');
        } else {
            item.classList.remove('z-dur');
            item.classList.remove('dur-1');
            item.classList.remove('dur--1');
        }


        if (dur == 0) {
            item.classList.add('z-dur');
        }

        if (dur < 0) {
            item.classList.add('rs-neg');
        } else {
            item.classList.remove('rs-neg');
        }

        this._addVars({
            "resizeHeight": +y + 'px',
            "addDuration": '"' + this._formatDuration(dur) + '"',
            "dragEndTime": '"' + this._formatTime(end) + '"'
        })

    }








    _formatDuration(minutes) {
        return (new Calc()).formatDuration(minutes);
    }


    _formatTime(str) {
        return (new Calc()).formatTime(str);
    }

    _duration(startTime, endTime) {
        return (new Calc()).duration(startTime, endTime);
    }


    _durationToHeight(d) {
        return Math.round(d / 15) * 10;
    }

    _heightToDuration(h) {
        return Math.round(h / 10) * 15;
    }

    _addOffset(value, addOffset) {
        return (new Calc()).addOffset(value, addOffset)
    }

    _snapOffsetEnd(value, addOffset, snap) {
        return (new Calc()).snapToTime(value, addOffset, snap)
    }


    _addVars(obj) {

        Object.keys(obj).forEach((k) => {
            this._vars[k] = obj[k];
        })

        this._item.style.cssText = Object.keys(this._vars).map((k) => {
            return '--' + k + ':' + this._vars[k] + ';'
        }).join(' ');
    }

    _removeVars(vars) {

        vars.forEach((k) => {
            delete this._vars[k];
        })

        this._item.style.cssText = Object.keys(this._vars).map((k) => {
            return '--' + k + ':' + this._vars[k] + ';'
        }).join(' ');
    }




}