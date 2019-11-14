pragma solidity ^0.4.26;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    mapping(address => uint) private authorizedContracts;

    // Airline Handling
    address[] airlines;
    mapping (address => bool) private registeredAirlines;
    mapping (address => uint) private airlineBalance;

    // Insurance Handling
    //mapping (address => bytes32) private insuredFlights;
    //bytes32[] insuredFlights;
    mapping (address => uint) private passengerBalances;
    mapping (bytes32 => address[]) private insuredFlightPassengers;
    mapping (bytes32 => mapping(address => uint)) private insuredAmount;
    mapping (bytes32 => mapping(address => uint)) private insuredPaidAmount;


    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address firstAirline
                                )
                                public
    {
        contractOwner = msg.sender;
        airlines.push(firstAirline);
        registeredAirlines[firstAirline] = true;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in
    *      the event there is an issue that needs to be fixed
    */
    modifier onlyWhenOperational()
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier onlyContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not the owner of this contract");
        _;
    }

    // Authorized Contract Caller should be App Contract
    modifier onlyAuthorizedContractCaller()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller (contract) is not authorized to call this contract");
        _;
    }

    // Only allow airlines that are not yet registered
    modifier onlyNotRegisteredAirline(address airline)
    {
        require(registeredAirlines[airline] == false, "Airline is already registered to this contract");
        _;
    }

    // Only allow airlines that are registered
    modifier onlyRegisteredAirline(address airline)
    {
        require(registeredAirlines[airline] == true, "Airline is not registered to this contract");
        _;
    }

    // Only allow calls from airlines that are registered
    modifier onlyRegisteredAirlineCaller()
    {
        require(registeredAirlines[msg.sender] == true, "Caller (airline) is not registered to call this contract");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
                            public
                            view
                            returns(bool)
    {
        return operational;
    }

    function isRegisteredAirline
                                (
                                    address airline
                                )
                                public
                                view
                                returns(bool)
    {
        return registeredAirlines[airline];
    }

    function isNotInsured
                        (
                            address airline,
                            string flight,
                            uint timestamp,
                            address passenger
                        )
                        external
                        view
                        returns(bool)
    {
        return(insuredAmount[getFlightKey(airline, flight, timestamp)][passenger] == 0);
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus
                            (
                                bool mode
                            )
                            external
                            onlyContractOwner
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function authorizeContract
                            (
                                address contractAddress
                            )
                            external
                            onlyContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

    function deauthorizeContract
                            (
                                address contractAddress
                            )
                            external
                            onlyContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline
                            (
                                address airline
                            )
                            external

                            onlyWhenOperational
                            onlyAuthorizedContractCaller
                            onlyNotRegisteredAirline(airline)


                            returns (bool success)
    {
        require(airline != address(0), 'Airline account cannot be blank');
        airlines.push(airline);
        registeredAirlines[airline] = true;

        return registeredAirlines[airline];

    }

    function getAirlines()
                        external
                        view
                        returns(address[] memory)
    {
        return airlines;
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fundAirline
                        (
                            address airline,
                            uint amount
                        )
                        public
                        payable

                        onlyWhenOperational
                        onlyAuthorizedContractCaller
                        onlyRegisteredAirline(airline)

    {
        airlineBalance[airline] = airlineBalance[airline].add(amount);
    }

    function getAirlineBalance
                            (
                                address airline
                            )
                            external
                            view

                            onlyWhenOperational
                            onlyAuthorizedContractCaller
                            onlyRegisteredAirline(airline)

                            returns(uint)
    {
        return airlineBalance[airline];
    }

    function getPassengerBalance(
                                    address passenger
                                )
                                external
                                view

                                onlyWhenOperational
                                onlyAuthorizedContractCaller

                                returns(uint)

    {
        return passengerBalances[passenger];
    }

   /**
    * @dev Buy insurance for a flight
    *
    */
    function buyInsurance
                            (
                                address airline,
                                string flight,
                                uint timestamp,
                                address passenger,
                                uint amount
                            )
                            external
                            payable

                            onlyWhenOperational
                            onlyAuthorizedContractCaller
                            onlyRegisteredAirline(airline)
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        //insuredFlights.push(flightKey);

        insuredFlightPassengers[flightKey].push(passenger);
        insuredAmount[flightKey][passenger] = amount;
        insuredPaidAmount[flightKey][passenger] = 0;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                            (
                                address airline,
                                string flight,
                                uint timestamp,
                                uint8 numerator,
                                uint8 denominator
                            )
                            external

                            onlyWhenOperational
                            onlyAuthorizedContractCaller
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        for(uint16 i = 0; i < insuredFlightPassengers[flightKey].length; i++) {
            address passenger = insuredFlightPassengers[flightKey][i];
            uint paid = insuredPaidAmount[flightKey][passenger];

            if(paid == 0) {

                uint payout = insuredAmount[flightKey][passenger].mul(numerator).div(denominator);

                insuredPaidAmount[flightKey][passenger] = payout;
                passengerBalances[passenger] = passengerBalances[passenger].add(payout);

            }
        }
    }


    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function payInsuree
                        (
                            uint payout,
                            address passenger
                        )
                        external

                        onlyWhenOperational
                        onlyAuthorizedContractCaller

                        returns(uint)
    {
        passengerBalances[passenger] = passengerBalances[passenger].sub(payout);
        passenger.transfer(payout);

        return passengerBalances[passenger];
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint timestamp
                        )
                        internal
                        pure
                        returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    function fund
                            (
                            )
                            public
                            payable
    {
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
                            external
                            payable
    {
        fund();
    }


}

