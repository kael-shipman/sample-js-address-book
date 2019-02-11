class Comm {
    constructor(proc) {
        this.proc = proc;
        var t = this;
        proc.stdin.on("data", function(line) { t.resolver(line.toString("utf8").trim()); });
        proc.stdin.on("error", function(e) { t.rejecter(e); });
    }

    prompt(prompt) {
        this.proc.stdout.write(prompt);

        var t = this;
        return new Promise(function(resolve, reject) {
            t.resolver = resolve;
            t.rejector = reject;
        });
    }
}

module.exports = Comm;
