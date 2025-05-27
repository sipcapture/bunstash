/* TODO: Make sure we return the module when using new InputHTTP() */
const InputHTTP = {}

/**
 * Start the module
 * @param {function} callback 
 */
InputHTTP.start = async function (callback) {
    console.log(`HTTP module start listening on ${InputHTTP.host}:${InputHTTP.port}`);
    return Bun.serve({
        host: InputHTTP.host,
        port: InputHTTP.port,
        fetch(req) {
            return new Response("Hello, world!");
        },
    });
}


exports.create = (configObj) => {
    console.log('Creating HTTP Input Module', configObj)
    InputHTTP.host = configObj.host
    InputHTTP.port = configObj.port
    return InputHTTP 
}

