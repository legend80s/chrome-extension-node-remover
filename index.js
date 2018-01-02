/**
 * both run in content_scripts and in popup.js
 */

main();


function main() {
  // run in popup.js
  if (typeof nodePaths !== 'undefined') {
    removeNodes(nodePaths, 'popup');
  } else {
    // run in content_scripts
    removeNodesFromStorage(window.location.origin)
  }
}

function removeNodesFromStorage(url) {
  getSavedNodePaths(url, (paths) => {
    console.log('[content_scripts] Nodes from storage of url', url, paths);
    if (paths) {
      removeNodes(paths, 'content_scripts');
    }
  });
}

function removeNodes(nodePaths, logPrefix) {
  console.log(`[${logPrefix}] Nodes to remove:`, nodePaths);

  nodePaths.forEach((path) => {
    const nodes = document.querySelectorAll(path);

    console.group(`[${logPrefix}] Find ${nodes.length} node(s) at path: "${path}".`);
    nodes.forEach((node, index) => {
      node.remove();
      console.log(`[${logPrefix}] Node#${index + 1} at path "${path}" removed.`);
    });
    console.groupEnd(`[${logPrefix}] Find ${nodes.length} node(s) at path: "${path}".`);
  });
}


/**
 * getSavedNodePaths
 * 
 * @private
 * @param  {[type]}   url      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
function getSavedNodePaths(url, callback) {
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We check
  // for chrome.runtime.lastError to ensure correctness even when the API call
  // fails.
  chrome.storage.sync.get(url, (items) => {
    let paths;
    try {
      paths = items[url].nodePaths;   
    } catch (error) {
      if (error instanceof TypeError) {
        paths = [];
      } else {
        throw error;
      }
    }

    callback(chrome.runtime.lastError ? null : paths);
  });
}
