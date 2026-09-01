//initialize necessary playing variables globally
let mass = 0;
let energy = 0;
let clickMultiplier = 0.01;
let sellMultiplier = 0.1;
let randomMulti = 0.9;
let clickScale = 1;

let intervals = [];

let form = $("#login").serializeArray();
let username = null;

let starType = ["basic-star", "blue-giant", "neutron-star", "black-hole"];

//admin stuff
let bypass = false;

//object for upgrades (to make updating cost/num easier)
let upgrades = {
    one: {
        //necessary variables
        id: "up-one",
        initialEnergyCost: 0.1,
        energyCost: 0.1,
        count: 0,
        
        //does the thing its supposed to
        effect: function() {
            let multiplier = 2.1 + Math.random() * randomMulti;
            clickMultiplier *= multiplier;
        },
        
        //multiplier to change the cost as the user upgrades
        costChange: function() {
            return 2.1 + Math.random() * randomMulti;
        },
        
        //makes the grey text to display current stats
        getInfo: function() {
            return formatNumber(clickMultiplier) + " mass/click";
        }
    },
    
    two: {
        id: "up-two",
        initialEnergyCost: 0.7,
        energyCost: 0.7,
        count: 0,
        effect: function() {
            let multiplier = 1.1 + Math.random() * randomMulti;
            sellMultiplier *= multiplier;
        },
        costChange: function() {
            return 1.1 + Math.random() * randomMulti;
        },
        getInfo: function() {
            return formatNumber(sellMultiplier) + " energy/mass";
        }
    },
    
    three: {
        id: "up-three",
        energyCost: 100,
        count: 0,
        effect: function() {
            doRebirth();
        },
        costChange: function() {
            return 10;
        },
        getInfo: function() {
            return starType[this.count/5];
        }
    },
    
    // passive clicking system
    four: {
        id: "up-four",
        energyCost: 10,
        count: 0,
        effect: function() {
            
            //clear intervals initially to not create extra intervals by accident
            for (let id of intervals) {
                clearInterval(id);
            }
            
            intervals = [];
            
            //stacks intervals for the amount of counts
            for (let i = 0; i < upgrades.four.count; i++) {
                setInterval(function() {
                    addMass(true);
                }, 1000);
                
                intervals.push(id);
            }   
        },
        costChange: function() {
            return 2.2 + Math.random() * 1.1;
        },
        getInfo: function() {
            return this.count + " auto-clicks/sec";
        }
    }
}

//loads data from before refresh to preserve data over refreshes
loadState();

//when you click, you get more mass
function addMass(passive=false) {
    if (!passive) {
        mass += clickMultiplier;
    } else if (passive) {
        mass += (clickMultiplier/10);
    }
    
    updateStats()
}

//energy is the currency, uses mass
function convertMass() {
    energy += mass * sellMultiplier;
    mass = 0;
    updateStats();
}

//update all the stats for everything
function updateStats() {
    $("#mass").text("Mass: " + formatNumber(mass));
    
    if (!bypass) {
        $("#energy").text("Energy: " + formatNumber(energy));    
    } else {
        $("#energy").text("Energy: BYPASSED");
    }
    
    for (let key in upgrades) {
        let up = upgrades[key];
        
        //generalized upgrade display (part of why its an object)
        $("#" + up.id + " .extra-info").text(up.getInfo());
        $("#" + up.id + " .cost").text(formatNumber(up.energyCost) + " energy");
        $("#" + up.id + " .numTimes").text("x" + up.count);
    }
    
    blackHoleSize();
    saveState(); //saves the state anytime something is changed
}

//upgrade usage (this is part of the reason upgrades are objects)
function upgrade(key) {
    let up = upgrades[key];
    
    if ((energy < up.energyCost) && (!bypass)) return;
    
    energy = (bypass) ? 0 : energy-up.energyCost; 
    up.count++;
    
    up.effect();
    up.energyCost *= up.costChange();
    
    updateStats();
}

//asked GPT how to format to scientific notation
function formatNumber(num) {
    if (num < 1000) return num.toFixed(3);
    
    let exp = num.toExponential(2);
    return exp.replace("e+", "x10^");
}

//reset stuff for each upgrade
function doRebirth() {
    
    //this is the benefit of the rebirth
    let multiplier = 1.1 + Math.random() * 0.1;
    randomMulti *= multiplier;
    
    //reset stuff
    mass = 0;
    //formula to give the player some leeway when they start after rebirth
    energy = mass ** (1/10) + energy ** (1/7) + upgrades.one.energyCost ** (1/10) + upgrades.two.energyCost ** (1/7) + upgrades.three.count;
    energy = Math.min(energy, 25);
    clickMultiplier = 0.01;
    sellMultiplier = 0.1;
    
    for (let key in upgrades) {
        let up = upgrades[key];
        
        if (up.initialEnergyCost) {
            up.energyCost = up.initialEnergyCost;
            up.count = 0;
        }
    }
    
    //changings clicking object for set amount of rebirths
    if ((upgrades.three.count % 5 == 0) && (upgrades.three.count <= 15)) {
        let newIndex = upgrades.three.count / 5;
        let oldIndex = newIndex - 1;
        $("#click-object").removeClass(starType[oldIndex]).addClass(starType[newIndex]);
    }
}

//cool function to change the size alongside the mass over time, although its not really noticeable until later
function blackHoleSize() {
    let scale = clickScale + (mass ** (1/10)) * 0.05;
    
    let finalScale = scale * clickScale;
    
    $("#click-object").css("transform", "scale(" + finalScale + ")");
}

//login functionality
function setUsername() {
    username = $("#login").serializeArray()[0].value;
    
    loadState();
    updateStats();
}

//save data to local storage to preserve over refreshes
function saveState() {
    if (!username) return;
    
    let currentSaveState = {
        mass: mass,
        energy: energy,
        clickMultiplier: clickMultiplier,
        sellMultiplier: sellMultiplier,
        randomMulti: randomMulti,
        upgrades: {}
    }
    
    for (let key in upgrades) {
        currentSaveState.upgrades[key] = {
            energyCost: upgrades[key].energyCost,
            count: upgrades[key].count
        }
    }
    
    localStorage.setItem(username, JSON.stringify(currentSaveState));
}

//load data on page load to preserve over refreshes
function loadState() {
    if (!username) return;
    
    let data = JSON.parse(localStorage.getItem(username));
    if (!data) return;
    
    mass = data.mass;
    energy = data.energy;
    clickMultiplier = data.clickMultiplier;
    sellMultiplier = data.sellMultiplier;
    randomMulti = data.randomMulti;
    
    for (let key in data.upgrades) {
        upgrades[key].energyCost = data.upgrades[key].energyCost;
        upgrades[key].count = data.upgrades[key].count;
    }
    
    for (let i = 0; i < upgrades.four.count; i++) {
        let id = setInterval(function() {
            addMass(true);
        }, 1000);
        
        intervals.push(id);
    }
    
    updateStats();
    $("#greeting").text("Welcome to Space Simulator, " + username + "!");
}

//resets everything and forces the page to reload
function resetState() {
    if (!username) return;
    localStorage.removeItem(username);
    location.reload(); //easier than having to update everything, since you're refreshing anyways
}

//actual functioning

//basic game function
$("#click-object").click(addMass);

//these 4 are feedback for the player when they're clicking the black hole (necessary since black hole scales with mass as well)
$("#click-object").on("mouseenter", function() {
    clickScale = 1.05;
    blackHoleSize();
})
$("#click-object").on("mouseleave", function() {
    clickScale = 1;
    blackHoleSize();
})
$("#click-object").on("mousedown", function() {
    clickScale = 0.95;
    blackHoleSize();
})
$("#click-object").on("mouseup", function() {
    clickScale = 1;
    blackHoleSize();
})

//convert to energy
$("#sell").click(convertMass);

//upgrades
$("#up-one").click(function() {
    upgrade("one");
});
$("#up-two").click(function() {
    upgrade("two");
});
$("#up-three").click(function() {
    upgrade("three");
});
$("#up-four").click(function() {
    upgrade("four");
});

//some key clicks
$(document).on("keydown", function(event) {
    if (event.key == "r") {
        resetState();
    }
    //Test Code
    if (event.key == "m") {
        bypass = !bypass;
        updateStats();
        console.log("bypass");
    }
});