import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

// Flight status codees
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

const ORACLES_COUNT = 30; 

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

let oracles = {};

web3.eth.getAccounts()
  .then((accounts) => { 
    console.log("- Attempting to register App contract with Data Contract...")

    flightSuretyData.methods.authorizeContract(config.appAddress).send({from:accounts[0]})
      .then(result => {
        console.log("SUCCESS!");
        console.log("- " + config.appAddress + " registered as authorized contract of Data Contract");
      })
      .catch(error => {
        console.log("ERROR!");
        console.log("- Error authorizing contract: " + error);
      })
      .then(result => {
        console.log("- Attempting to register " + ORACLES_COUNT + " oracles...");
      });
    
    if(ORACLES_COUNT > accounts.length) console.log("WARNING - You are trying to register more oracles than accounts available! Decrease oracle count or increase account pool in Ganache.")
    flightSuretyApp.methods.REGISTRATION_FEE().call()
      .then(registrationFee => {
        for(let i = (accounts.length - ORACLES_COUNT); i < accounts.length; i++) {
          flightSuretyApp.methods.registerOracle().send({from:accounts[i], value:registrationFee, gas:4500000})
          .then(result => {
            flightSuretyApp.methods.getMyIndexes().call({from:accounts[i]})
            .then(indices => {
              oracles[accounts[i]] = indices;
              console.log("- Registered oracle " + accounts[i] + " with indices: " + indices);
            })
          })
          .catch(error => {
            console.log("ERROR!");
            console.log("- Error registering oracle " + accounts[i] +  " with error: " + error);
          });
        }
      })
  });

flightSuretyApp.events.OracleRequest({fromBlock:0}, function (error, event) {
  if (error) console.log(error)
  else{
    const index = event.returnValues.index;
    const airline = event.returnValues.airline;
    const flight = event.returnValues.flight;
    const timestamp = event.returnValues.timestamp;
    const allStatusCodes  = [0, 10, 20, 30, 40, 50];

    for(var account in oracles)
    {
      var indices = oracles[account];
      if(indices.includes(index))
      {
        let statusCode = allStatusCodes[Math.floor(Math.random() * allStatusCodes.length)];
        console.log("Flight status code is: " + statusCode);

        flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, statusCode).send({from:account, gas:1500000})
          .then(result => {
            console.log("Oracle responded with status code: " + statusCode + " for request for " + flight + " with index:"+ index);
          })
          .catch(error => {
            console.log("Oracle response errored out for "+ flight + " with error: " + error)
          });
      }
    }
  }
});

flightSuretyApp.events.FlightStatusInfo({
  fromBlock: 0
}, function (error, event) {
  if (error) console.log(error)
  else {
    console.log(JSON.stringify(event))
  }
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;