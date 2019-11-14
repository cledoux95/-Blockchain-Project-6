
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.callRegisterAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isRegisteredAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  // ADDED TESTS

  it('(airline) cannot register an Airline unless already registered', async () => {
    
    // ARRANGE
    let newAirline = accounts[3];
    let unregisteredAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.callRegisterAirline(newAirline, {from: config.unregisteredAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isRegisteredAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('(airline) can register an Airline once registered and adequately funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    let fee = await config.flightSuretyApp.MIN_FUNDING_AMOUNT.call();

    // ACT
    try {
        await config.flightSuretyApp.callFundAirline({value: fee, from: config.firstAirline, nonce: await web3.eth.getTransactionCount(config.firstAirline)});
    }
    catch(e) {
        console.log(e);
    }

    try {
        await config.flightSuretyApp.callGetAirlineBalance(config.firstAirline);
    }
    catch(e) {
        console.log(e);
    }

    try {
        await config.flightSuretyApp.callRegisterAirline(newAirline, {from: config.firstAirline, nonce: await web3.eth.getTransactionCount(config.firstAirline)});
    }
    catch(e) {
        console.log(e);
    }
    
    let result = await config.flightSuretyData.isRegisteredAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, true, "Airline should be able to register another airline if it has provided adequate funding");

  });
 
  it('(airline) cannot register airlines by itself after multiparty limitation reached', async () => {
    
    // ARRANGE
    let limit = (await config.flightSuretyApp.MULTIPARTY_CONSENSUS_COUNT.call()).toString();
 
    // ACT
    try {
        for(a = 3; a <= 5; a++) {
            await config.flightSuretyApp.callRegisterAirline(accounts[a], {from: config.firstAirline, nonce: await web3.eth.getTransactionCount(config.firstAirline)});
        }
    }
    catch(e) {
        console.log(e);
    }
    
    let result = await config.flightSuretyApp.callGetAirlines(); 

    // ASSERT
    assert.equal(result.length == limit, true, "Airline should not be able to register another airline by itself past the multiparty limitation");

  });

  it('(airline) can register airlines after multiparty limitation once other airlines vote for that airline', async () => {
    
    // ARRANGE
    let limit = (await config.flightSuretyApp.MULTIPARTY_CONSENSUS_COUNT.call()).toString();
    let fee = await config.flightSuretyApp.MIN_FUNDING_AMOUNT.call();
 
    // ACT
    try {
        await config.flightSuretyApp.callFundAirline({value: fee, from: accounts[3], nonce: await web3.eth.getTransactionCount(accounts[3])});
        await config.flightSuretyApp.callRegisterAirline(accounts[5], {from: accounts[3], nonce: await web3.eth.getTransactionCount(accounts[3])});

    }
    catch(e) {
        console.log(e);
    }

    let result = await config.flightSuretyApp.callGetAirlines(); 
    
    // ASSERT
    assert.equal(result.length > limit, true, "Airline should be able to be registered past the multiparty limitation with multiple votes");

  });

});
