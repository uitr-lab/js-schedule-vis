export class Element {

	constructor(type, options) {

		var el = document.createElement(type);
		Object.keys(options || {}).forEach((key) => {

			var v = options[key];

			if (key == 'html') {

				if(v instanceof HTMLElement){
					el.appendChild(v);
					return;
				}

				el.innerHTML = v;
				return;
			}

			if (key == 'events') {
				Object.keys(v).forEach((event) => {
					el.addEventListener(event, v[event]);
				});
				return;
			}

			if (key == 'class') {
				v.split(' ').forEach((name)=>{
					if(name.length==0){
						return;
					}
					el.classList.add(name);
				})
				
				return;
			}


			if((['type', 'value', 'href', 'target', 'name', 'for', 'checked', 'placeholder', 'selected', 'disabled', 'src', 'async', 'defer']).indexOf(key)>=0){
				if(key==='for'){
					key='htmlFor';
				}
				el[key]=v
			}


		});

		//returns a html element, not a class instance

		return el;
	}


}

window.Element=Element;