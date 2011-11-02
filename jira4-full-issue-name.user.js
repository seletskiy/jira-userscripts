// JIRA4 Full Issue Name
// Version 0.1
// 07-02-2011
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
// @name          JIRA4 Full Issue Name
// @namespace     http://jira.ngs.local/
// @description   Добавляет поле ввода для копирования полного имени задачи
// @match         http://jira.ngs.local/*
// @match         http://jira/*
// @version       0.1
// @include       http://jira.ngs.local/*
// @include       http://jira/*
// ==/UserScript==

(function () {
	var script = function () {
		var lib = {
			$: window.jQuery,
			style: function style(selector, rules) {
				var style;
				style = document.createElement("style");
				style.type = "text/css";
				style.textContent = selector + " {" + rules.join(";") + "}";
				document.getElementsByTagName("head")[0].appendChild(style);
			},
		};

		var ui = {
			issueDetails: lib.$("#issuedetails"),
			issueNameField: lib.$('<li class="item"/>')
				.append(
					lib.$('<div class="wrap"/>')
						.append(
							lib.$('<strong class="name">Имя задачи</strong>'))
						.append(
							lib.$('<span id="fullissuename-val" class="value"/>')
								.append(
									lib.$('<input type="text"/>')))),
			issueKey: lib.$('#key-val'),
			issueSummary: lib.$('.item-summary')
		};

		ui.issueNameField.find('input')
			.val(
				ui.issueKey.text() + ": " + ui.issueSummary.text())
			.attr(
				'readonly', true)
			.click(function () {
					this.select();
				});

		ui.issueDetails.append(ui.issueNameField);

		var styles = {
			"#fullissuename-val input": [
				"padding: 1px 2px",
				"width: 100%"
			]
		};

		for (selector in styles) {
			lib.style(selector, styles[selector]);
		}
	}

	function inject(callback) {
		var script = document.createElement("script");
		script.textContent = "(" + callback.toString() + ")();";
		document.body.appendChild(script);
	}

	inject(script);
}());
