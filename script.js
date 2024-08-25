'use strict';
class workout {
    date = new Date();
    id=  (Date.now() + ' ').slice(-10)
    clicks =0;

    constructor (coords, distance, duration){
        this.coords = coords; //[lat,lng]
        this.distance = distance; //in km
        this.duration = duration; //in min
    }
    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
          months[this.date.getMonth()]
        } ${this.date.getDate()}`;
      }
    click(){
        this.clicks++;
    }
}

class Running extends workout{
    type = 'running'; //property available for the marker

    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }
    calcPace(){
        //min/km
        this.pace= this.duration/this.distance
        return this.pace;
    }
}
class Cycling extends workout{
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain){
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed(){
        // km/H
        this.speed = this.distance/this.duration/60;
        return this.speed;
    }
}

//////////////////////////////////////////////////
//Application architecture
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App{
    #map; //private instance properties
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor(){
        //Get users position
        this._getPosition();
        //Get data from local storage;
        this._getLocalStorage();
        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this)) //this will point to form and not to app
        //change event ( cadence and elevation )
        inputType.addEventListener('change', this._toggleElevationField)
        //Event for moving the pop up
        containerWorkouts.addEventListener('click', this._moveToPopUp.bind(this))
    }

    _getPosition(){
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(
            this._loadMap.bind(this), 
            function(){
            alert(`We could not find your curr location`)
        });
      }  
    }
    _loadMap(position){
            const {latitude} = position.coords;
            const {longitude}= position.coords;
            //console.log(`https://www.google.com.ar/maps/@${latitude},${longitude}`)
            
            //Set an array coords
            const coords = [latitude, longitude];
        
            //I must hav an ID of map
            this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
            //Open street is one map but we can use goole
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);
    
            //Handling clicks on map
            this.#map.on('click', this._showForm.bind(this));

            //Here we will render the markers
            this.#workouts.forEach(work=>
                this._renderWorkoutMarker(work)
            )
        }
    _showForm(mapE){
        this.#mapEvent = mapE;
                form.classList.remove('hidden')
                inputDistance.focus();
    }
    _hideForm(){
        //empty inputs
        inputDistance.value = inputDuration.value =inputCadence.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(()=>(form.style.display = 'grid'),1000)
    }
    _toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden') //search a parent
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden') //search a parent
    }
    _newWorkout(e){  
        const validInputs = (...inputs)=> 
            inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs)=> 
            inputs.every(inp =>inp > 0);

        e.preventDefault();

        //Get data from the form
        const type= inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout; 

        //If wo is running, create a running obj
        if(type ==='running'){
            const cadence = +inputCadence.value;
            //Check if data is valid
            if( 
                !validInputs(distance,duration,cadence) ||
                !allPositive(distance,duration,cadence)
            )
                return alert('Inputs have to be possitive numbers')
            
            workout = new Running([lat,lng],distance, duration,cadence);
        }

        //If wo is cycling, create a ciclying obj
        if(type === 'cycling'){
            const elevation = +inputElevation.value;
            if(
                !validInputs(distance,duration,elevation) ||
                !allPositive(distance,duration)
            )
                return alert('Inputs have to be possitive numbers')

            workout = new Cycling([lat,lng],distance, duration,elevation);
        }
        //Add new obj to workout array
        this.#workouts.push(workout); //I have a var that is workouts [] empty;

        //Render wo on map as marker
        this._renderWorkoutMarker(workout);

        //Render wo on list
        this._renderWorkout(workout);

        //Hide form and clear input fields
        this._hideForm();

        // Set local storage to all workouts
        this._setLocalStorage();
    };
    _renderWorkoutMarker(workout) {
        L.marker(workout.coords) //not put [lat,lng]
                .addTo(this.#map)
                .bindPopup(
                    L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false, 
                    className: `${workout.type}-popup`,//viene del css property
                })
                )
                .setPopupContent(`${workout.type === 'running'? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
                .openPopup();
    }
    _renderWorkout(workout){
        let html =
        `<li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running'? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

        if(workout.type === 'running')
            html+=`
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
            </div>
            </li>`
        ;
        if(workout.type === 'cycling')
            html +=
        `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span> //calculated by script
        <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
        </div>
        </li>`;
        form.insertAdjacentHTML('afterend', html);
    }
    _moveToPopUp(e){
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl){return};

        const workout = this.#workouts.find(
            work => work.id === workoutEl.dataset.id
        );

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
        //Using the public interface
        
        //workout.click();
    }
    _setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts))
    }
    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem('workouts'))
        if (!data) return;
        this.#workouts = data;

        this.#workouts.forEach(work=>
            this._renderWorkout(work), //armar cada uno en la lista
        )
    }
    reset(){
        localStorage.removeItem('workouts');
        location.reload(); //in app.reset()
    }
}

//CREATE AN OBJ
const app = new App ();
