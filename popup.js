// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Get the current URL.
 *
 * @param {function(string)} callback called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, (tabs) => {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    console.log('[popup] whole url:', url);
    const matches = url.match(/.+\.com/);
    callback(matches !== null ? matches[0] : url);
  });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, (tabs) => {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

/**
 * Gets the saved background color for url.
 *
 * @param {string} url URL whose background color is to be retrieved.
 * @param {function(string)} callback called with the saved background color for
 *     the given url on success, or a falsy value if no color is retrieved.
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

/**
 * Sets the given background color for url.
 *
 * @param {string} url URL for which background color is to be saved.
 * @param {string} color The background color to be saved.
 */
function saveNodePaths(url, paths) {
  var items = {};
  items[url] = { nodePaths: paths };
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We omit the
  // optional callback since we don't need to perform any action once the
  // background color is saved.
  console.log('Save items', items);
  chrome.storage.sync.set(items);
}

function clearStorage(url, cb) {
  console.log('[popup] clear storage of', url);
  chrome.storage.sync.remove(url, cb());
}

/**
 * @param {Array} 
 */
function removeNodes(ids) {
  // See https://developer.chrome.com/extensions/tabs#method-executeScript.
  // chrome.tabs.executeScript allows us to programmatically inject JavaScript
  // into a page. Since we omit the optional first argument "tabId", the script
  // is inserted into the active tab of the current window, which serves as the
  // default.
  // console.log('`var nodePaths = ${JSON.stringify(ids)};`', `var nodePaths = ${JSON.stringify(ids)};`);
  chrome.tabs.executeScript({
    code: `var nodePaths = ${JSON.stringify(ids)};`
  }, () => {
    chrome.tabs.executeScript({
      file: 'index.js',
    });
  });
}

// This extension loads the saved background color for the current tab if one
// exists. The user can select a new background color from the dropdown for the
// current page, and it will be saved as part of the extension's isolated
// storage. The chrome.storage API is used for this purpose. This is different
// from the window.localStorage API, which is synchronous and stores data bound
// to a document's origin. Also, using chrome.storage.sync instead of
// chrome.storage.local allows the extension data to be synced across multiple
// user devices.
chrome.tabs && document.addEventListener('DOMContentLoaded', () => {
  getCurrentTabUrl((url) => {
    const nodePathInput = document.getElementById('nodes');

    getSavedNodePaths(url, (paths) => {
      console.log('[popup] Nodes from storage', paths);
      if (paths) {
        nodePathInput.value = paths.join(', ');
        removeNodes(paths);
      }
    });

    document.getElementById('submit').addEventListener('submit', (event) => {
      event.preventDefault();
      const paths = nodePathInput.value.trim().split(/,/).map((path) => path.trim()).filter(id => id !== '');

      removeNodes(paths);
      saveNodePaths(url, paths);
    }, false);

    document.getElementById('clear').addEventListener('click', (event) => {
      clearStorage(url, () => {
        nodePathInput.value = '';
      });
    });
  });  
});
