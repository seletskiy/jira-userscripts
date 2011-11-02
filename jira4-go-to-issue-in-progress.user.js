// JIRA4 Go To Issue In Progress
// Version 0.1 beta
// 26-01-2011
// Autor: Stanislav Seletskiy <s.seletskiy@gmail.com>

// This is a Greasemonkey user script.
//
// To install, you need Greasemonkey: https://addons.mozilla.org/en-US/firefox/addon/748
// Then restart Firefox and revisit this script.
// Under Tools, there will be a new menu item to "Install User Script".
// Accept the default configuration and install.
//
// If you are using Google Chrome, just drag and drop this script file
// into the browser, it should install automatically.
//
// To uninstall, go to Tools/Manage User Scripts,
// select "JIRA4 Worklog Helper", and click Uninstall.

// ==UserScript==
// @name          JIRA4 Go To Issue In Progress
// @namespace     http://jira.ngs.local/
// @description   Press 'r' to go to first issue in progess.
// @match         http://jira.ngs.local/*
// @version       0.1 beta
// @include       http://jira.ngs.local/*
// ==/UserScript==

(function(){
	var script = function() {
		var lib = {
			$: window.jQuery,
			_: function(text) {
				if (typeof messages[lang][text] == "undefined") {
					return text;
				} else {
					return messages[lang][text];
				}
			}
		}

		var lang = {
			'Create Issue': 'en',
			'Создать': 'ru'
		}[lib.$("#create_link").text()] || 'en';

		var messages = {
			'ru': {
				'In progress': 'В процессе'
			},
			'en': {}
		};

		var token = lib.$("#atlassian-token").attr('content');

		var goToActiveIssue = function () {
			lib.$.get(
				"/secure/IssueNavigator!executeAdvanced.jspa", {
					jqlQuery: 'status="' + lib._('In progress') + '" AND assignee=currentUser()',
					runQuery: 'true'
				}, function (response) {
					var matches = response.match(/issuetype.*?a href="\/browse\/([^"]+)"/);
					if (matches && matches.length) {
						var issueKey = matches[1];
						location.href = '/browse/' + issueKey;
					}
				}
			);
		};

		var isTyping = function () {
			var someElementIsActive = false;
			lib.$('input[type=text], textarea, select').each(function () {
				if (this == document.activeElement) {
					someElementIsActive = true;
				}
			});

			return someElementIsActive;
		};

		var isFindAheadActivated = function () {
			var tabox = lib.$('tabox');
			if (tabox.is(':visible')) {
				return true;
			} else {
				return false;
			}
		};

		lib.$(window).keydown(function (e) {
			if (e.keyCode == 82) {
				if (isTyping()) {
					return;
				}

				if (isFindAheadActivated()) {
					return;
				}

				if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
					return;
				}

				goToActiveIssue();

				return false;
			}
		});
	}

	function inject(callback) {
		var script = document.createElement("script");
		script.textContent = "(" + callback.toString() + ")();";
		document.body.appendChild(script);
	}

	inject(script);
}());
