import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
        
        contract.initializeContractState(function(){});

        if(Object.keys(contract.availableFlights).length < 5){
            contract.initializeFlights(function(){
                initializeInsurancePurchasing(contract.passengers, contract.airlines, contract.availableFlights);
            });
        } else {
            initializeInsurancePurchasing(contract.passengers, contract.airlines, contract.availableFlights);
        }

        DOM.elid('checkStatus').addEventListener('click', () => {
            let airline = DOM.elid('airlines').value;
            let flight = DOM.elid('flightNumbers').value;
            let date = DOM.elid('datepicker').value;
            let timestamp = new Date(date).getTime()/1000;
            contract.fetchFlightStatus(airline, flight, timestamp, (error, result) => {
                display('Flight Status', 'Flight Status', [ { label: 'Fetch Flight Status', error: error, value: result} ]);
            });
        })

        DOM.elid('airlines').addEventListener('change', () => {
            let airline = DOM.elid('airlines').value;
            let flights = contract.availableFlights[airline];
            populateFlights(flights,'flightNumbers');
           
        })

        DOM.elid('buyInsurance').addEventListener('click', () => {
            let airline = DOM.elid('airlines').value;
            let flight = DOM.elid('flightNumbers').value;
            let insuranceAmount = DOM.elid('insuranceAmount').value;
            let passenger = DOM.elid('passengers').value;
            let date = DOM.elid('datepicker').value;
            let timestamp = new Date(date).getTime()/1000;
            contract.buyInsurance(airline, flight, timestamp, passenger, insuranceAmount, (error, result) => {
                display('Insurance', 'Buy Insurance', [ { label: 'Buy Insurance', error: error, value: result } ]);
            });
        })

        DOM.elid('withdrawFunds').addEventListener('click', () => {
            let amount = DOM.elid('withdrawalAmount').value;
            let passenger = DOM.elid('passengersWithdrawal').value;
            contract.payInsuredPassenger(amount, passenger, (error, result) => {
                display('Withdrawal', 'Insurance Withdrawal', [ { label: 'Insurance Withdrawal', error: error, value: result } ]);
            });
        })

        DOM.elid('checkBalance').addEventListener('click', () => {
            let passenger = DOM.elid('passengersBalance').value;
            contract.getBalance(passenger, (error, result) => {
                if(error) {
                    console.log(error);
                }
                setBalance(result,'passengerBalance');;
            });
            
        })
    
    });
    
})();

function initializeInsurancePurchasing(passengers, airlines, availableFlights) {
    let airline = airlines[0];
    let flights = availableFlights[airline];

    populatePassengers(passengers,'passengers');
    populatePassengers(passengers,'passengersBalance');
    populatePassengers(passengers,'passengersWithdrawal');
    populateAirlines(airlines,'airlines');
    populateFlights(flights,'flightNumbers');
    setMinInputDate();
}

function setMinInputDate() {
    var today = new Date();
    var dd = today.getDate() + 1;
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    if(dd<10){
            dd='0'+dd
        } 
        if(mm<10){
            mm='0'+mm
        } 

    today = yyyy+'-'+mm+'-'+dd;
    document.getElementById("datepicker").setAttribute("min", today);
}0 


function populatePassengers(passengers, elid){
    var list = document.getElementById(elid); 
    list.innerHTML = "";

    passengers.forEach(function(passenger) {

        var option = document.createElement("option");
        option.text = passenger;
        option.value = passenger;
        list.add(option);
    });
}

function populateAirlines(airlines, elid){
    var list = document.getElementById(elid); 
    list.innerHTML = "";

    airlines.forEach(function(airline) {

        var option = document.createElement("option");
        option.text = airline;
        option.value = airline;
        list.add(option);
    });
}

function populateFlights(flights, elid){
    var list = document.getElementById(elid); 
    list.innerHTML = "";

    flights.forEach(function(flight) {

        var option = document.createElement("option");
        option.text = flight;
        option.value = flight;
        list.add(option);
    });
}

function setBalance(balance, elid) {
    var output = document.getElementById(elid);

    output.value = balance;
}

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







