var fs = require("fs");
var Comm = require("./Comm");

class AddressBook {
    /**
     * On construct, uses either STDIN or the passed file to source its data
     */
    constructor(datafile, proc, options) {
        this.datafile = datafile;
        this.proc = proc;
        this.options = Object.assign({
            verbosity: 1
        }, options || {});
        this.comm = new Comm(proc);

        // Make sure datafile isn't null
        if (datafile === null) {
            throw new Error("You must pass in a valid data file");
        }

        // Now process....
        // TODO: piping into stdin no longer works as expected
        if (datafile === "-") {
            var t = this;
            var stdin = "";
            this.proc.stdin.on("data", function(chunk) { stdin += chunk; });
            this.proc.stdin.on("end", function() { t.data = JSON.parse(stdin); });
        } else {
            if (!fs.existsSync(this.datafile)) {
                this.data = {
                    entries: []
                };
            } else {
                this.data = JSON.parse(fs.readFileSync(datafile));
                if (typeof this.data.entries === "undefined") {
                    this.data.entries = [];
                }
            }
        }
    }

    /**
     * This function "opens" the book, effectively providing the user with a prompt
     * asking what s/he wants to do.
     */
    async open() {
        while(true) {
            var output = null;
            var command = await this.comm.prompt("Command: ");

            try {
                if (command.match(/^help/)) {
                    this.proc.stdout.write(`\nAvailable commands:\n${AddressBook.getCommands()}\n`);
                } else if (command.match(/^list/)) {
                    command = command.split(" ");
                    command.shift();
                    output = this.list(command.join(" "));
                } else if (command.match(/^add/)) {
                    command = command.split(" ");
                    command.shift();
                    output = await this.add(command.join(" "));
                } else if (command.match(/^delete/)) {
                    command = command.split(" ");
                    command.shift();
                    output = this.delete(command.join(" "));
                } else if (command.match(/^count/)) {
                    command = command.split(" ");
                    command.shift();
                    output = this.count(command.join(" "));
                } else if (command.match(/^write/)) {
                    output = this.write();
                } else if (command.match(/^quit/)) {
                    this.proc.stdout.write(`\nSaving and quitting.\n`);
                    this.write();
                    this.proc.stdin.pause();
                    return;
                } else {
                    throw new Error(`Command '${command}' not recognized. Recognized commands are:\n${AddressBook.getCommands()}`);
                }
            } catch (e) {
                this.proc.stderr.write(`\nERROR: ${e.message}\n`);
            }

            if (output !== null) {
                this.proc.stdout.write(`\n${output}\n`);
            }
        }
    }















    /**
     * List all entries in the book matching the given filter
     */
    list(filter) {
        if (!filter) {
            filter = "*";
        }

        // Get
        var entries = this.getFilteredEntries(filter);

        // Format
        if (entries.length > 0) {
            for (var i = 0; i < entries.length; i++) {
                entries[i] = `${entries[i].name}: ${entries[i].address}`;
            }
            entries = entries.join("\n");
        } else {
            entries = "(No entries found)";
        }


        // Return
        return entries;
    }

    /**
     * Add an entry to the book by either passing a JSON string or by answer questions
     */
    async add(data) {
        var t = this;
        var validate = function(d) {
            // Make sure we've got the basic fields
            if (!d.name || !d.address) {
                throw new Error("You must provide at least name and address fields for your entry");
            }

            // Make sure we're not entering a duplicate
            if (t.getFilteredEntries({ name: d.name }).length > 0) {
                throw new Error("Looks like you've already got an entry with that name.");
            }
        }

        // If we've passed data, infalte it
        if (data) {
            try {
                data = JSON.parse(data);
            } catch(e) {
                throw new Error("If you pass data to the add command, it must be valid JSON");
            }

        // If we haven't passed ask the user
        } else {
            data = {};
            data.name = await this.comm.prompt("Name: ");
            data.address = await this.comm.prompt("Address: ");
        }

        // Validate and insert
        validate(data);
        this.data.entries.push(data);

        return "Entry successfully added";
    }

    /**
     * Delete all entries in the book matching the given filter
     */
    delete(filter) {
        if (!filter) {
            throw new Error("You must pass a filter to the delete function. You may pass asterisk (*) to delete all entries.");
        }

        var t = this;
        var count = this.count(filter);
        if (count > 0) {
            this.data.entries = this.data.entries.filter(function(entry) {
                return !t.match(entry, filter);
            });
            return `${count} entries successfully deleted.`;
        } else {
            return "No entries matched; none deleted.";
        }
    }

    /**
     * Count how many entries in the book match the given filter
     */
    count(filter) {
        if (!filter) {
            throw new Error("You must pass a filter to the count function. You may pass asterisk (*) to count all entries.");
        }

        var entries = this.getFilteredEntries(filter);
        return `${entries.length} entries found`;
    }











    /**
     * Get all entries matching the given filter
     */
    getFilteredEntries(filter) {
        var t = this;
        return this.data.entries.filter(function(entry) {
            return t.match(entry, filter);
        });
    }

    /**
     * External matching function so we can use this with both delete and filter
     */
    match(entry, filter) {
        if (typeof filter === "string") {
            return (
                filter === "*" ||
                (entry.name && entry.name.match(filter)) ||
                (entry.address && entry.address.match(filter))
            );
        } else {
            var passed = true;

            // For each key, if it exists, see if it matches (otherwise pass it)
            for (var key in filter) {
                if (typeof entry[key] !== "undefined" && entry[key] !== filter[key]) {
                    passed = false;
                }
            }
            return passed;
        }
    }

    /**
     * Writes data to disk (or STDOUT, if requested)
     */
    write() {
        if (typeof this.datafile === "string") {
            fs.writeFileSync(this.datafile, JSON.stringify(this.data));
            return "Save successful";
        } else {
            this.proc.stdout.write(JSON.stringify(this.data));
        }
    }

    static help() {
        return `
SYNOPSIS

address-book -h|--help
address-book - [options]
address-book -f|--datafile /path/to/datafile [options]

DESCRIPTION

Access an address book. You may add or delete entries, search for entries, or get statistics
about your address book. (See below for command syntax.)

OPTIONS

-                      Read from STDIN and write to STDOUT
-f|--datafile [path]   Read from [path] and write to [path]
-v(vv)                 Increase verbosity of output
-q|--quiet             Silence all output

COMMANDS

Once the program has been initialized, you may use the following commands to access its
functions. Note that for all [filter] paramters, asterisk (*) matches all.
${AddressBook.getCommands()}
`;
    }

    static getCommands() {
        return `
list ([filter])                  List all addresses matching the (optional) filter.
add ([data])                     Add an entry. If you don't provide [data] (in json format),
                                 this initiates an interactive questionnaire.
delete [filter]                  Delete all entries matching filter.
count ([filter])                 List the number of entries, optionally matching the given filter.
write                            Save the current data
quit                             Save and exit
`;
    }
}

module.exports = AddressBook;
