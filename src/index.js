#!/usr/bin/env nodejs

var fs = require("fs");
var AddressBook = require("./AddressBook");

var args = process.argv;

// Remove the first two arguments (interpreter and command line)
args.shift();
args.shift();






// Prepare system variables

/**
 * datafile string The path to the data file to read and write from (if `-`, read
 * from stdin and write to stdout).
 */
var datafile = "-";

/**
 * verbosity number The level of verbosity of output.
 *
 * 0 = silent
 * 1 = normal
 * 2+ = more verbose
 */
var verbosity = 1;






// Get incoming arguments
while (args.length > 0) {
    if (args[0] === "-") {
        datafile = "-";
        args.shift();
    } else if (args[0] === "-f" || args[0] === "--datafile") {
        datafile = args[1];
        args.shift();
        args.shift();
    } else if (args[0].match(/^-v+$/)) {
        var vs = args[0].split("");
        verbosity += vs.length - 1;
        args.shift();
    } else if (args[0] === "-q" || args[0] === "--quiet") {
        verbosity = 0;
        args.shift();
    } else if (args[0] === "-h" || args[0] === "--help") {
        console.log(AddressBook.help());
        process.exit(0);
    } else {
        throw new Error(`Unknown argument '${args[0]}' found.`);
    }
}





// Create address book and pass it options
var addressBook = new AddressBook(
    datafile,
    process,
    {
        verbosity: verbosity
    }
);

// TODO: Juggle incoming commands via command-line vs starting up interactive prompt
addressBook.open();


