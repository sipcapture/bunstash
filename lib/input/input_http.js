const http = import('node:http')
const https = import('node:https')

const InputHTTP = {}
/**
 * Start the module
 * @param {function} callback 
 */
InputHTTP.start = async function (callback) {
    console.log('HTTP module starting')
}


exports.create = () => { return InputHTTP }

