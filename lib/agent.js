/**
 * BunStash, a bun-powered logstash-like agent to transform and handle data
 * Using Inputs, Filters and Outputs, handle many types of data and transform it
 * to new consumers
 * (C) 2024 - QXIP BV
 */

/**
 * Function to Start Agent
 * @param {ArrayObject} config 
 */
export async function start (config) {
        console.log('BunStash Agent started')
        /**
         * Modules Object
         * @type {Object}
         * @property {Array} inputs - List of Input Modules
         * @property {Array} filters - List of Filter Modules
         * @property {Array} outputs - List of Output Modules
         */
        let modules = {
                inputs: [],
                filters: [],
                outputs: []
        }

        /**
         * Loop through Config and extract modules objects
         */
        for (var i = 0; i < config.length; i++) {
            console.log('Config:', config[i])
            for (let protocol in config[i]) {
                console.log('Protocol:', protocol)
                if (protocol == 'input') {
                        console.log('Inputs:', config[i][protocol], config.length)
                        modules.inputs.push(config[i][protocol])
                } else if (protocol == 'filter') {
                        console.log('Filters:', config[i][protocol], config.length)
                        modules.filters.push(config[i][protocol])
                } else if (protocol == 'output') {
                        console.log('Outputs:', config[i][protocol], config.length)
                        modules.outputs.push(config[i][protocol])
                } else {
                        console.log('Unknown Protocol:', protocol)
                }
            }
        }

        await startModules(modules.outputs, 'Output')
        await startModules(modules.filters, 'Filter')
        await startModules(modules.inputs, 'Input')
}

async function startModules(modules, type) {
        for (var i = 0; i < modules.length; i++) {
                console.log(`Starting ${type} Module: ${JSON.stringify(modules[i])} which is ${i+1} of ${modules.length} `)
                for (let module of modules[i]) {
                        console.log('Module:', module)
                        for (let module_name in module) {
                                console.log('Loading Module:', module_name)
                                let moduleObject = {}
                                try {
                                        let path = import.meta.env.npm_package_json.match(/^(.*\/)/)[0] + 'lib/' + type.toLowerCase() + '/' + type.toLowerCase() + '_' + module_name + '.js'
                                        console.log('Path:', path)
                                        moduleObject = require(path)
                                } catch (error) {
                                        console.log('Error during module load:', error)
                                        try {
                                                console.log('Trying Global Path:', module_name)
                                                let global_path = import.meta.env.npm_package_json.match(/^(.*\/)(bunstash\/)/)[0]+ module_name + '/' + module_name + '.js'
                                                console.log('Global Path:', global_path)
                                                moduleObject = require(global_path)  
                                        } catch (error) {
                                                console.log('Error during global module load:', error)
                                                console.log('Skipping Module:', module_name)
                                        }
                                        
                                }
                                if (!moduleObject) {
                                        console.log('Module not loaded:', module_name)
                                        continue
                                }
                                console.log('Module Object:', moduleObject?.create)
                                if (moduleObject?.create) {
                                        console.log('Module Loaded:', module_name)
                                        let moduleInstance = moduleObject.create()
                                        console.log('Module Instance:', moduleInstance)
                                        if (moduleInstance?.start) {
                                                console.log('Module Loaded:', module_name)
                                                moduleInstance.start(()=>{
                                                console.log('Module Started', module_name) 
                                                })
                                        }
                                }
                                
                        }
                }
        }
}
