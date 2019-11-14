import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.availableFlights = {};
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
            let self = this;
           
            self.owner = accts[0];
            self.firstAirline = accts[1];

            let counter = 1;
            
            while(self.airlines.length < 5) {
                self.airlines.push(accts[counter++]);
            }
            
            
            while(self.passengers.length < 5) {
                self.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    initializeContractState(callback) {
        let self = this;

        const fundAmountWei = self.web3.utils.toWei("10", "ether");

        self.fundAirline(self.firstAirline, fundAmountWei, function(error, result){
            if(error){
                console.log(error);
            }
            let i = 1
            while(i < self.airlines.length){
                
                self.registerAirline(self.firstAirline, self.airlines[i++], function(error, result){
                    if(error){
                        console.log(error);
                    }
                    console.log(result);
                });
            }
            self.fundAirline(self.airlines[1], fundAmountWei, function(error, result){
                if(error){
                    console.log(error);
                }
                self.registerAirline(self.airlines[1], self.airlines[4], function(error, result){
                    if(error){
                        console.log(error);
                    }
                    else{
                        console.log(result);
                    }

                    self.flightSuretyApp.methods
                        .callGetAirlines()
                        .call({from: self.firstAirline})
                        .then(result => {
                            console.log(result);

                            callback();
                        });
                });
            });

        });
    }

    initializeFlights(callback){
        let self = this;

        let i = 0
        while (i < self.airlines.length){
            self.availableFlights[`${self.airlines[i]}`] = [
                `A${i + 1} ${Math.ceil(Math.random() * 100)}`,
                `A${i + 1} ${Math.ceil(Math.random() * 100)}`,
                `A${i + 1} ${Math.ceil(Math.random() * 100)}`
            ];
            i++   
        }
        
        callback();
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({from: self.owner}, callback);
    }
    
    fundAirline(fromAirline, fundAmountWei, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .callFundAirline()
            .send({from: fromAirline, value: fundAmountWei, gas: 1000000}, (error, result) => {
                callback(error, result);
            });
    }

    registerAirline(fromAirline, registreeAirline, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .callRegisterAirline(registreeAirline)
            .send({from: fromAirline, gas: 1000000}, (error, result) => {
                callback(error, result);
            });
    }

    buyInsurance(airline, flight, timestamp, fromPassenger, insuranceAmount, callback) {
        let self = this;

        self.flightSuretyApp.methods
        .callBuyInsurance(airline, flight, timestamp)
        .send({from: fromPassenger, value: self.web3.utils.toWei(insuranceAmount, "ether"), gas: 1000000}, (error, result) => {
            callback(error, result);
        });
    }

    getBalance(passenger, callback) {
        let self = this;

        self.flightSuretyApp.methods
        .callGetPassengerBalance()
        .call({from: passenger, gas: 1000000}, (error, result) => {
            callback(error, self.web3.utils.fromWei(result.toString(), "ether"));
        });
    }

    payInsuredPassenger(amount, passenger, callback) {
        let self = this;

        self.flightSuretyApp.methods
        .callPayInsuree(self.web3.utils.toWei(amount, "ether"))
        .send({from: passenger, gas: 1000000}, (error, result) => {
            callback(error, result);
        })
    }

    fetchFlightStatus(airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: timestamp
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }
}