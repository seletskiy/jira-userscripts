// JIRA5 Full Issue Name
// Version 0.2
// 02-07-2012
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
// select "JIRA5 Worklog Helper", and click Uninstall.

// ==UserScript==
// @name          JIRA5 Full Issue Name
// @namespace     http://jira.ngs.local/
// @description   Добавляет поле ввода для копирования полного имени задачи
// @match         http://jira.ngs.local/*
// @match         http://jira/*
// @version       0.2
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
							lib.$('<strong class="name">Issue Name:</strong>'))
						.append(
							lib.$('<span id="fullissuename-val" class="value"/>')
								.append(
									lib.$('<input type="text"/>'))))
		};

        lib.$.getJSON(
            '/rest/api/latest/issue/' + jira.app.issue.getIssueKey(),
            function (data) {
                ui.issueNameField.find('input')
                    .val(data['key'] + ": " + data['fields']['summary'])
                    .click(function () { this.select(); });

                ui.issueDetails.append(ui.issueNameField);
            });

		var styles = {
			"#fullissuename-val input": [
				"padding: 0 3px",
                "margin-left: -5px",
                "border: 1px solid #ddd",
                "border-left-width: 3px",
				"width: 100%"
			],
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
