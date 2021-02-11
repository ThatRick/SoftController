///////////////////////////////
//          Circuit
///////////////////////////////
var CircuitEvent;
(function (CircuitEvent) {
    CircuitEvent[CircuitEvent["BlockAdded"] = 0] = "BlockAdded";
    CircuitEvent[CircuitEvent["BlockRemoved"] = 1] = "BlockRemoved";
})(CircuitEvent || (CircuitEvent = {}));
export {};
