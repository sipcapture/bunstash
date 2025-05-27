/**
 * BunStash, a bun-powered logstash-like agent to transform and handle data
 * Using Inputs, Filters and Outputs, handle many types of data and transform it
 * to new consumers
 * (C) 2024 - QXIP BV
 */

/**
 * Imports
 */

/**
 * Globals
 */
const Globals = {
    debug: true, // Set to true to enable debug mode
}

/**
 * Type Definitions
 */

/** @typedef {{input:[{module:string}], filter?: [{module:string}], output: [{module:string}]}} ParsedConfig */

/**
 * Function to get the configuration file and parse it
 * @param {string} configFile Path to the configuration file 
 * @returns {Promise<ParsedConfig>} Parsed configuration object
 * @throws If the configuration file cannot be read or parsed exit with error code 3
 */
async function processConfigFile (configFile) {
    try {
        let config = Bun.file(configFile, 'utf-8');
        /** @type {ParsedConfig} */
        let parsedConfig = await config.json();
        console.log('🔍-- Config file found:', parsedConfig);
        return parsedConfig;
    } catch (error) {
        console.error('🚫-- Error reading config file:', error);
        process.exit(3);
    }
}

/**
 * Function to check flags and get/create config file
 * @returns {Promise<ParsedConfig>} JSON configuration file
 */
async function checkFlags () {
    let args = process.argv;

    if (args.includes('-h')) {
        console.log('🍞');
        console.log('Provide a configuration file via -c or use the -cli option to create it interactively');
        console.log('Use the cli if you are new to Bunstash to see what it can do.');
        process.exit(0);
    }

    if (args.includes('-cli')) {
        console.log('🚧 -- CLI option not yet implemented');
        /* Call CLI which interactively creates a config file */
        process.exit(0);
    }

    if (args.includes('-c')) {
        let configFile = args[args.indexOf('-c') + 1];
        return processConfigFile(configFile);
    } else {
        console.log('⚠️ -- Provide a config file via -c or use the -cli option to create it interactively');
        process.exit(1);
    }

}

/**
 * Observation Module
 */
const observationModule = {
    /**
     * Observable Groups
     * @type {{input: object[], filter: object[], output: object[]}}}
     */
    observableGroups: {
        input: [],
        filter: [],
        output: []
    },
    /**
     * Register modules from the config file
     * @param {string} groupName 
     * @param {object[]} modules 
     * @returns {boolean} True if modules were registered successfully, false otherwise
     * @throws If the group is not valid
     */
    registerModules: function (groupName, modules) {
        if (Globals.debug) console.log(`Observation Module: 📦 -- Registering modules for group ${groupName}`);
        if (!this.observableGroups[groupName]) {
            console.error(`🚫 -- No observable group found with name ${groupName}`);
            return false;
        }
        
        this.observableGroups[groupName] = this.observableGroups[groupName].concat(modules);
        if (Globals.debug) console.log(`Observation Module: 📦 -- Registered ${modules.length} modules for group ${groupName}`);
    },
    /**
     * Array to store subscribed modules
     * @type {{input: object[], filter: object[], output: object[]}}
     */
    subscribedModules: {
        input: [],
        filter: [],
        output: []
    },
    /**
     * 
     * @param {string} observerGroup 
     * @param {object} observer 
     */
    subscribe: function (observerGroup, observer) {
        if (Globals.debug) console.log(`Observation Module: 🔔 -- Subscribing ${observer} to ${observerGroup}`);
        if (!this.observableGroups[observerGroup]) {
            console.error(`🚫 -- No observable group found with name ${observerGroup}`);
            return false;
        }
        if (!this.subscribedModules[observerGroup]) {
            this.subscribedModules[observerGroup] = [];
        }
        this.subscribedModules[observerGroup].push(observer);
        if (Globals.debug) console.log(`Observation Module: 🔔 -- Subscribed ${observer} to ${observerGroup}`);
    },
    /**
     * Sending data to all observers in a subscription group
     * @param {string} observerGroup 
     * @param {object} data 
     */
    emit: function (observerGroup, data) {
        this.subscribedModules[observerGroup].forEach(observer => {
            if (Globals.debug) console.log(`Observation Module: 📤 -- Emitting data to ${observer.module} in group ${observerGroup}`);
            observer(data);
        })
    }
};

const modulesManager = {
    /**
     * Initialize a module by its name
     * @param {string} observerGroup
     * @param {object} moduleConfig 
     * @returns {object} Initialized module
     */
    initializeModule: function (observerGroup, moduleConfig) {
        if (Globals.debug) console.log(`Modules Manager: 🔧 -- Initializing module ${moduleConfig.module}`);
        try {
            const module = require(`./lib/${observerGroup}/${moduleConfig.module}`);
            const moduleInstance = new module(moduleConfig);
            if (Globals.debug) console.log(`Modules Manager: 🔧 -- Initialized module ${moduleConfig.module}`);
            return moduleInstance;
        } catch (error) {
            console.error(`🚫 -- Error initializing module ${moduleConfig.module}:`, error);
            throw error;
        }
    }
}

/**
 * Sets up Observable Groups from the config and 
 * subscribes each item to the appropriate group.
 * @param {ParsedConfig} config 
 * @returns 
 */
async function setupObservableGroups (config) {
    console.log('🔬-- Setting up Observables');
    if (config.input) {
        console.log('➡️  -- Input:', config.input);
        observationModule.registerModules('input', config.input);
    } else {
        console.error('🚫  -- No input observer found. Need at least one.');
        process.exit(1);
    }
    
    if (config.filter) {
        console.log('🪤  -- Filter:', config.filter);
        observationModule.registerModules('filter', config.filter);
    } 

    if (config.output) {
        console.log('➡️  -- Output:', config.output);
        observationModule.registerModules('output', config.output);
    } else {
        console.error('🚫  -- No output observer found. Need at least one. Try adding "\"stdout\":{}" if you are still testing.');
        process.exit(1);
    }

    console.log('🔗-- Setting up filter and output observers.');
    
    // Set up filter modules if they exist
    if (observationModule.observableGroups.filter && observationModule.observableGroups.filter.length > 0) {
        console.log('🔄 -- Connecting filters to input modules');
        // Subscribe each filter module to input modules' data events
        for (let filterModule of observationModule.observableGroups.filter) {
            filterModule = modulesManager.initializeModule('filter', filterModule);
            if (filterModule.data) {
                observationModule.subscribe('input', filterModule.data);
            } else {
                console.warn(`⚠️ -- Filter module ${filterModule.module} does not have a data event to process data.`);
                console.warn('⚠️ -- Filter modules should implement a data event to process data, otherwise they will not receive data from input modules.');
            }
        }
        
        // Subscribe output modules to filter modules
        console.log('🔄 -- Connecting outputs to filter modules');
        for (let outputModule of observationModule.observableGroups.output) {
            outputModule = modulesManager.initializeModule('output', outputModule);
            if (outputModule.data) {
                observationModule.subscribe('filter', outputModule.data);
            } else {
                console.warn(`⚠️ -- Output module ${outputModule.module} does not have a data event to process data.`);
                console.warn('⚠️ -- Output modules should implement a data event to process data, otherwise they will not receive data from filter modules.');
            }   
        }
    } else {
        // No filters, connect outputs directly to inputs
        console.log('🔄 -- No filters, connecting outputs directly to input modules');
        for (let outputModule of observationModule.observableGroups.output) {
            outputModule = modulesManager.initializeModule('output', outputModule);
            if (outputModule.data) {
                observationModule.subscribe('input', outputModule.data);
            } else {
                console.warn(`⚠️ -- Output module ${outputModule.module} does not have a data event to process data.`);
                console.warn('⚠️ -- Output modules should implement a data event to process data, otherwise they will not receive data from filter modules.');
            }   
        }
    }

    console.log('🔗-- Starting Input Observers');
    for (let inputModule of observationModule.observableGroups.input) {
        inputModule = modulesManager.initializeModule('input', inputModule);
    }

    return true;
}   

async function main () {
    console.log('🍞 Bunstash is a data ingestion, transformation pipeline tool. Come visit us at https://github.com/sipcapture/bunstash \n');
    console.log('------------------------------------------------------------------------------------------------------------------------');
    let config = await checkFlags();
    await setupObservableGroups(config);
}

main();

/**
 * Handle interrupt signals (CTRL-C / CMD-C)
 * for graceful shutdown
 */
process.on('SIGINT', () => {
    console.log('\n🛑 Interrupt received, shutting down gracefully...');
    // Perform any cleanup operations here
    console.log('👋 Goodbye!');
    process.exit(0);
});