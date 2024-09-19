export class Calc {

    snapToTime(value, addOffset, snap){

        if(typeof snap=="undefined"){
            snap=addOffset;
            addOffset=0;
        }

        var _pad=(n)=>{
            n=n+"";
            if(n.length==1){
                return "0"+n;
            }
            return n;
        };

        var m=(parseInt(value.split(':').shift())*60)+parseInt(value.split(':').pop());
        m=(Math.round((m+addOffset)/snap)*snap);

       return _pad(Math.floor(m/60))+':'+_pad(m%60);

    }

    addOffset(value, addOffset){
    
        var _pad=(n)=>{
            n=n+"";
            if(n.length==1){
                return "0"+n;
            }
            return n;
        };

        var m=(parseInt(value.split(':').shift())*60)+parseInt(value.split(':').pop())+addOffset;
        return _pad(Math.floor(m/60))+':'+_pad(m%60);
    }



    formatDuratation(minutes){

        /**
         * returns a string like: [-]{H}h {M}min or [-]{M}min ie: -1h 15min
         */

        var sign="";
        if(minutes<0){
            sign="-";
            minutes=Math.abs(minutes)
        }

        var h= Math.floor(minutes/60);
        var m=minutes%60;

        if(h==0){
            return sign+m+"min";
        }

        return sign+h+"h"+(m!==0?", "+m+"m":"");
    }
    
    formatTime(str){

        var hours=parseInt(str.split(':').shift());
        var mins=parseInt(str.split(':').pop());

        var hourStr=hours;
        if(hours===0){
            hourStr="12";
        }

        if(hours>12){
            hourStr=hours-12;
        }


        return hourStr+":"+(mins<10?"0":"")+mins+(hours<12?'AM':'PM');

    }

}