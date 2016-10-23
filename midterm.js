var req = require('request');
const repl = require('repl');
var _ = require('underscore');
var csv = require('csv');
var generate = require('csv-generate');
var fs = require('fs');

var CSVFILE_DEFAULT = "coinbase.csv";
var orders = {};
var market = {
	exchange_rates: {}
};

//Request data from website
req('https://coinbase.com/api/v1/currencies/exchange_rates',function (error, response, body) {
	if (!error) {
    	market.exchange_rates = JSON.parse(body);
  	}
});

//Run start so that this implementation starts over every time
repl.start({prompt: 'coinbase> ', eval: myEval});

function myEval(cmd, context, filename, callback){

		//reformat inputs ['buy','10','usd']
		var inputs = cmd.toLowerCase().replace('\n', '').split(' ');
		//conver buying amount to float
		var amount = parseFloat(inputs[1]);
		// Set order ID 
		var orderID = new Date().toString();
		// Set currency default to BTC
		var currency = 'BTC';
      
        //Check if command is buy or sell or order
        switch (inputs[0]) {

			case 'buy':
				//If the entered currency is not undefined make the currency capitalized
				if (typeof(inputs[2]) != 'undefined') {
					currency = inputs[2].toUpperCase();
				}
				//Check that the user did enter an amount
				if (!amount) {
					callback('No amount specified.');
					break;
				}
				//If the given currency is not BTC then look up the exchange rate and convert to btc
				if (currency != 'BTC') {
            		//Look up the rate from the JSON object created above
            		var rate = market.exchange_rates[ 'btc_to_' + currency.toLowerCase() ];
            		//Check that the rate is there 
					if (typeof(rate) != 'undefined') {
	              		//Log order into order dictionary
						orders[ orderID ] = {
							orderID : orderID,
							type: 'buy',
							amount: amount, 
							currency: currency
						};
	              		//Calculate amount of bitcoins you are buying
	            		var amount_in_btc = amount / rate;
						callback('Order to BUY ' + amount.toString() + ' ' + currency + ' worth of BTC queued @ ' + rate + ' BTC/' + currency + ' (' + amount_in_btc + ' BTC) ' );     
	            	} else {
                		console.log('No known exchange rate for BTC/' + currency + '. Order failed.');
          			}
        		} else { //If a currency is not specified by the user then use the default BTC
					orders[ orderID ] = {
						orderID : orderID,
						type: 'buy',
						amount: amount,
						currency: currency
					};
              		callback('Order to BUY ' + amount.toString() + ' BTC queued.');
            	}
          		break;

      		case 'sell':
				//If the entered currency is not undefined make the currency capitalized
				if (typeof(inputs[2]) != 'undefined') {
					currency = inputs[2].toUpperCase();
				}
				//Check that the user did enter an amount
				if (!amount) {
					callback('No amount specified.');
					break;
				}
              	//If the given currency is not BTC then look up the exchange rate and convert to btc
				if (currency != 'BTC') {
					//Look up the rate from the JSON object created above
					var rate = market.exchange_rates[ 'btc_to_' + currency.toLowerCase() ];
					//Check that the rate is there 
                  	if (typeof(rate) != 'undefined') {
                    	//Log order into order dictionary
						orders[ orderID ] = {
							orderID : orderID,
							type: 'sell',
							amount: amount,
							currency: currency
						};
                  		var amount_in_btc = amount / rate;
                  		callback('Order to SELL ' + amount.toString() + ' ' + currency + ' worth of BTC queued @ ' + rate + ' BTC/' + currency + ' (' + amount_in_btc + ' BTC) ' );              
                  	} else {
                    	console.log('No known exchange rate for BTC/' + currency + '. Order failed.');
                    }
              	} else {
					orders[ orderID ] = {
						orderID : orderID,
						type: 'sell',
						amount: amount,
						currency: currency
					};
                    callback('Order to SELL ' + amount.toString() + ' BTC queued.');
                }
          		break;
          
          	//Display all outstanding orders
          	case 'orders':
				console.log('=== CURRENT ORDERS ===');
				var headers = ["orderID","type","amount","currency"];
				var stringifier = csv.stringify({ header: true, columns: headers}); //Display header
               	_.each(orders,function(order,orderID){ 
            	    var result = orderID + ' : ' + order.type.toUpperCase() + ' ' + order.amount + ' : UNFILLED';
                    console.log(result);
                    //Use generator to make csv file and pass in all data
                    var generator = generate({columns: ['int', 'bool'], length: 2});
                    generator.pipe(csv.transform(function(record){
            	        return Object.keys(orders[orderID]).map(function(key,value){
							return orders[orderID][key] //This is where the keys are stored in each row
                        })
                    }))
                    .pipe(stringifier)
                    .pipe(fs.createWriteStream('out.csv',{flags: 'w' }));                
                });
               	callback();
          		break;

          	default:
				console.log('unknown command: "' + cmd + '"');
          		break;
		}
}