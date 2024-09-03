const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Get the current working directory
const cwd = process.cwd();
const sourceDir = path.join(cwd, 'extension');
const destinationDir = path.join(cwd, 'output');
const manifestFile = path.join(sourceDir, 'manifest.json');
const manifestVersion = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))['version'];
const xpiOutputFile = path.join(cwd, `aibird-${manifestVersion}.xpi`);

/**
 * @param {string} dir The directory to walk through
 * @param {function} callback A function that is called for each file and directory. It has two parameters: the first is a string representing the file path, and the second is an fs.Stats object representing the file's metadata.
 */
const walkSync = (dir, callback) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    var filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile()) {
      callback(filepath, stats);
    }
  });
};
// Function to zip the 'aibird' directory
function zipDirectory(sourceDir, outputFile) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputFile);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`Archive created: ${outputFile}`);
            resolve();
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

//// RUNTIME ////
// Step 0: Cleanup
// Create the destination directory if it doesn't exist
if (fs.existsSync(destinationDir)) {
    fs.rmSync(destinationDir, { recursive: true, force: true });
    console.log(`SETUP: Deleting existing export.`);
}
fs.mkdirSync(destinationDir, { recursive: true });
if (fs.existsSync(xpiOutputFile)) {
    fs.rmSync(xpiOutputFile, { force: true })
    console.log(`SETUP: Deleting existing .xpi extension`)
}

// Step 1: Copy extension to output
console.log(`COPYF: Extension copied to output.`)
fs.cpSync(sourceDir, destinationDir, { recursive: true });

// Step 2: Remove bad files
walkSync(destinationDir, (f, s) => {
    let del = false;

    // Filters
    del = del || f.endsWith('.scss')
    del = del || f.endsWith('.css.map')

    if (del){
        fs.rmSync(f)
        console.log(`REMOV: Deleting ${f}`)
    }
})

// Step 3: Pacakge files
zipDirectory(destinationDir, xpiOutputFile)
    .then(() => {
        console.log('Extension zipped as .xpi');
    })
    .catch((error) => {
        console.error('An error occurred while zipping the directory:', error);
    });
