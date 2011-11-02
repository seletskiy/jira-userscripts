// JIRA4 Worklog Helper
// Version 1.4
// 01-11-2011
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
// @name          JIRA4 Worklog Helper
// @namespace     http://jira.ngs.local/
// @description   Tracks time have being spent on issues / Подсчитывает время, затраченное на задачи
// @match         http://jira.ngs.local/*
// @match         http://jira/*
// @version       1.3+
// @include       http://jira.ngs.local/*
// @include       http://jira/*
// ==/UserScript==

(function () {
var script = function () {
	//
	// Library functions.
	//
	var lib = {
		$: window.jQuery,
		style: function style(selector, rules) {
			var style;
			style = document.createElement("style");
			style.type = "text/css";
			style.textContent = selector + " {" + rules.join(";") + "}";
			document.getElementsByTagName("head")[0].appendChild(style);
		},
		now: function () {
			return new Date();
		},
		tomorrow: function () {
			var now = new Date();
			return new Date(
				now.getFullYear(), now.getMonth(), now.getDate() + 1 );
		},
		yesterday: function () {
			var now = new Date();
			return new Date(
				now.getFullYear(), now.getMonth(), now.getDate() - 1 );
		},
		dateDiff: function (from, what) {
			var zeroTime = new Date(0);
			return new Date(from.getTime() - what.getTime() -
				zeroTime.getHours() * 60 * 60 * 1000);
		},
		parseSpent: function (spent) {
			var minutes = parseInt((spent.match(/(\d+)m/i) || [0, 1])[1]);
			var hours = parseInt((spent.match(/(\d+)h/i) || [0, 0])[1]);

			return ((hours > 0) ? hours + "h " : "") +
				((minutes == 0 && hours == 0) ? 1 : minutes) + "m";
		},
		spentToDate: function (spent) {
			var minutes = parseInt((spent.match(/(\d+)m/i) || [0, 1])[1]);
			var hours = parseInt((spent.match(/(\d+)h/i) || [0, 0])[1]);

			var zeroTime = new Date(0);
			return new Date((minutes + (hours - zeroTime.getHours()) * 60) * 60000);
		},
		setCookie: function (name, value) {
			document.cookie =
				name + "=" + encodeURIComponent(value) +
				";expires=" + lib.tomorrow().toGMTString() +
				";path=" + location.pathname;
		},
		getCookie: function (name) {
			var regexp = new RegExp(name + "=([^;]+)");
			return decodeURIComponent((document.cookie.match(regexp) ||
				[null, ""])[1]);
				"worklog_started=" + date.getTime() +
				";expires=" + lib.tomorrow().toGMTString();
		},
		form: function (url, data, type) {
			var form = lib.$(document.createElement('form')).
				attr('action', url).
				attr('method', type || 'post').
				css('display', 'none');
			form.appendTo('body');
			for (name in data) {
				form.append(lib.$(document.createElement('input')).
					val(data[name]).attr('name', name));
			}
			return form;
		},
		toJiraDate: function (date) {
			var d = date.toString().
				match(/^\w+ ([^ ]+) (\d\d) \d\d(\d\d) (\d\d):(\d\d)/);
			var localeMonth = months[lang][d[1]] || d[1];
			var hour12 = d[4] > 12 ? d[4] % 12 : d[4];
			if (hour12 == 0) {
				hour12 = 12;
			}
			return d[2] + "/" + localeMonth + "/" + d[3] + " " +
				hour12 + ":" + d[5] + " " +
				((d[4] < 12) ? "AM" : "PM");
		},
		fromJiraDate: function (date) {
			var d = date.match(
				/(\d\d)\/([^/]+)\/(\d\d) (\d?\d):(\d\d) (AM|PM)/);

			var localMonth = d[2];
			for (month in months[lang]) {
				if (months[lang][month] == d[2]) {
					localMonth = month;
				}
			}

			var hour24 = parseInt(d[4]);
			if (d[6] == "PM") {
				if (d[4] < 12) {
					hour24 += 12;
				}
			} else {
				if (d[4] == 12) {
					hour24 = 0;
				}
			}

			return new Date(
				localMonth + " " + d[1] + ", " + "20" + d[3] + " " +
				hour24 + ":" + d[5]
			)
		},
		isTyping: function () {
			var someElementIsActive = false;
			lib.$('input[type=text], textarea, select').each(function () {
				if (this == document.activeElement) {
					someElementIsActive = true;
				}
			});

			return someElementIsActive;
		},
		_: function (text) {
			if (typeof messages[lang][text] == "undefined") {
				return text;
			} else {
				return messages[lang][text];
			}
		}
	};

	//
	// Hotkeys codes.
	//
	var hotkeys = {
		startStopProgress: 83,
		esc: 27,
		enter: 13
	};

	//
	// Language detection.
	//
	var lang = {
		'Create Issue': 'en',
		'Создать': 'ru'
	}[lib.$("#create_link").text()] || 'en';

	//
	// Months for different languages.
	//
	var months = {
		"ru": {
			"Jan": "янв", "Feb": "фев",
			"Mar": "мар", "Apr": "апр",
			"May": "май", "Jun": "июн",
			"Jul": "июл", "Aug": "авг",
			"Sep": "сен", "Oct": "окт",
			"Nov": "ноя", "Dec": "дек"
		},
		"en": {}
	};

	//
	// Messages for different languages.
	//
	var messages = {
		"ru": {
			"Time Spent": "Затрачено времени",
			"Work Description": "Описание работы",
			"Log": "Записать",
			"Stop without tracking": "Остановить без записи в журнал",
			"Cancel": "Отмена",
			'Please press restart an issue, \
because I can\'t find a proper date when \
issue was started.': "Пожалуйста, перезапустите задачу, " +
					"я не могу найти подходящего времени, когда работа над " +
					"ней была начата.",
			"Logging...": "Сохранение...",
			"Stopping progress...": "Остановка работы...",
			"Status": "Статус",
			"Start / Stop Progress": "Начать / Закончить работу",
			"Your session expired, please \
try to reload a page or relogin to Jira.": "Ваша сессия истекла, пожалуйста, " +
					"попробуйте обновить страницу или выполнить вход в Jira.",
			"Are you really wish to stop progress without tracking spended time?":
				"Вы действительно хотите закончить работу по задаче без сохранения потраченного времени?",
			"Can't log spent time. Trying again...":
				"Не могу сохранить время, затраченное на задачу. Пробую снова..."
		},
		"en": {}
	};

	//
	// User interface elements.
	//
	var ui = {
		stopProgressButton: lib.$("#action_id_301"),
		startProgressButton: lib.$("#action_id_4"),
		commentButton: lib.$("#comment-issue"),
		commentForm: lib.$("#add_comment"),
		stalker: lib.$("#stalker"),
		spentTimeIndicator: (function () {
			var input = lib.$(document.createElement('input'));
			input.attr("id", "worklog-spent-time");
			var updateTime = function () {
				var oldTime = lib.dateDiff(lib.now(), issue.started);
				input.val(lib.parseSpent(input.val()));
				var newTime = lib.spentToDate(input.val());

				issue.started.setTime(
					issue.started.getTime() -
						(newTime.getTime() - oldTime.getTime()));
				lib.setCookie("worklog_started", issue.started.getTime());
				ui.spentTimeFinalIndicator.val(input.val());
			};
			input.change(updateTime);
			input.keyup(function (e) {
				e.stopPropagation();
				if (e.keyCode == hotkeys.enter) {
					updateTime();
					input[0].blur();
				} else if (e.keyCode == hotkeys.esc) {
					input.removeClass("focused");
					input[0].blur();
				}
			});
			input.focus(function () {
				input.addClass("focused");
				input.addClass("changed");
			});
			input.blur(function () {
				input.removeClass("focused");
			});
			input.mouseover(function () {
				input.addClass("focused");
			});
			input.mouseout(function () {
				if (document.activeElement != input[0]) {
					input.removeClass("focused");
				}
			})
			return input;
		}()),
		worklogForm: (function () {
			var form = lib.$(document.createElement("form"));
			form.addClass("aui").addClass("top-label");
			form.attr("id", "worklog-form").
				attr("action", "/secure/CreateWorklog.jspa");
			form.append(
				'<div>' +
					'<label for="worklog-spent-time-final">' +
						lib._("Time Spent") +
					'</label>' +
					'<input id="worklog-spent-time-final"' +
						'name="spent-time"/>' +
				'</div>' +
				'<div>' +
					'<label for="worklog-description">' +
						lib._("Work Description") +
					'</label>' +
					'<textarea id="worklog-description"' +
						'class="textarea" wrap="virtual" rows="4">' +
					'</textarea>' +
				'</div>' +
				'<div class="submit">' +
					'<input id="worklog-submit" class="submit_btn"' +
						'type="button" value="' + lib._("Log") + '"/>' +
					'<input id="worklog-submit-skip" class="submit_btn"' +
						'type="button" value="' + lib._("Stop without tracking") + '"/>' +
					'<a id="worklog-submit-cancel" class="cancel"' +
						'href="#" accesskey="`">' +
						lib._("Cancel") +
					'</a>' +
				' '
			);

			form.hide = function () {
				ui.stopProgressButton.removeClass("active");
				ui.stalker.removeClass("action");
				form.appendTo('body');
			}

			form.show = function () {
				ui.stopProgressButton.addClass("active");
				ui.stalker.addClass("action");
				ui.worklogForm.appendTo(".ops-cont");
				ui.spentTimeFinalIndicator.val(ui.spentTimeIndicator.val());
				ui.worklogDescription.focus();
				ui.worklogDescription.val(lib.getCookie("worklog_description"));
				ui.worklogDescription[0].select();
			}

			form.find("#worklog-description").keyup(function (e) {
				var $this = lib.$(this);
				var scroll = $this[0].scrollHeight;
				var height = $this.innerHeight();
				var currentRows = $this.attr('rows');
				var targetRows = Math.round(scroll / (height / currentRows));

				if (targetRows < 3) {
					$this.attr('rows', 4);
				} else if (targetRows < 10) {
					$this.attr('rows', targetRows);
				}

				lib.setCookie("worklog_description", $this.val());
			});

			form.find("#worklog-submit-cancel").click(function () {
				form.hide();
				return false;
			});

			form.keyup(function (e) {
				if (e.keyCode == hotkeys.startStopProgress) {
					e.stopPropagation();
				} else if (e.keyCode == hotkeys.enter && e.ctrlKey) {
					form.submit();
				}
			});

			return form;
		}())
	};

	ui.spentTimeFinalIndicator = ui.worklogForm.
		find("#worklog-spent-time-final");
	ui.worklogDescription = ui.worklogForm.find("#worklog-description");
	ui.worklogSubmit = ui.worklogForm.find("#worklog-submit");
	ui.worklogSubmitSkip = ui.worklogForm.find("#worklog-submit-skip");

	//
	// Current page detection.
	//
	var page = {
		stopProgress: ui.stopProgressButton.length,
		startProgress: ui.startProgressButton.length
	}

	if (page.stopProgress) {
		var issue = {
			id: lib.$("#id").val(),
			started: new Date(parseInt(lib.getCookie("worklog_started") || 0))
		};

		lib.$("#action_id_5").addClass("first");
		lib.$("#action_id_4").addClass("last");
		lib.$("#action_id_301").parent().addClass("last");

		if (issue.started.getTime() == 0) {
			var historyUrl = lib.$('#changehistory-tabpanel').attr('href') ||
				location.href;

			// Opera fix.
			historyUrl = historyUrl.match(/^([^#]*)/)[1];

			lib.$.get(historyUrl, {}, function (response) {
				// Trying to find last change, that starts issue.
				var historyPart = (response.
					match(/id="primary"[^>]*>([\s\S]*)<div[^>]*id="secondary"/i) ||
						[null, ""])[1];
				var container = lib.$(document.createElement('div')).
					append(historyPart);

				var historyItems = container.
					find(".activity-name:contains(" + lib._("Status") +
							") ~ " +
						".activity-new-val:contains(\"[    3\")");
				var date = historyItems.eq(historyItems.length - 1).
					parents(".action-body").prev().
						find(".date").text();

				if (!date) {
					alert(lib._('Please press restart an issue, ' +
						'because I can\'t find a proper date when ' +
						'issue was started.'))
				} else {
					issue.started = lib.fromJiraDate(date);
					if (issue.started.getTime() > lib.now().getTime()) {
						issue.started.setTime(lib.now().getTime());
					}

					lib.setCookie("worklog_started", issue.started.getTime());
				}
			});
		}

		ui.spentTimeIndicator.insertAfter(ui.stopProgressButton);
		ui.spentTimeIndicator.update = function () {
			setTimeout(ui.spentTimeIndicator.update, 1000);
			if (ui.spentTimeIndicator[0] == document.activeElement) {
				return;
			}
			var spent = lib.dateDiff(lib.now(), issue.started);
			var spentParts = [];
			spentParts.push(spent.getHours() + "h");
			spentParts.push(spent.getMinutes() + "m");
			ui.spentTimeIndicator.val(lib.parseSpent(spentParts.join(" ")));
		}

		ui.spentTimeIndicator.update();

		ui.stopProgressButton.click(function (e) {
			e.preventDefault();
			if (ui.worklogForm.is(":visible")) {
				ui.worklogForm.hide();
			} else {
				ui.stalker.removeClass("action");
				ui.commentForm.hide();
				ui.commentButton.removeClass("active");
				ui.worklogForm.show();
			}
		} );

		//
		// Periodic check for issue status.
		//
		(function (timeout) {
			var inProgress = lib.getCookie("issue_in_progress");
			if (inProgress.length && inProgress == "0") {
				if (!timeout && page.stopProgress) {
					lib.setCookie("issue_in_progress", 1);
				} else {
					location.reload();
				}
			}

			var callback = arguments.callee;

			setTimeout(function() {callback(true)}, 5000);
		}(false));

		var debug_startTime = lib.now();

		var commitWorklog = function (stopOnly) {
			ui.worklogForm.find(":input").attr("disabled");
			var token = lib.$("#atlassian-token").attr('content');


			ui.worklogForm.find(":input").attr("disabled", true);
			if (stopOnly) {
				ui.worklogSubmitSkip.val(lib._("Stopping progress..."));
			} else {
				ui.worklogSubmit.val(lib._("Logging..."));
			}

			var increaseTime = function (id, authToken, time, description) {
				var oldTimeSpent = lib.$('#tt_single_values_spent').text().replace(/^\s*|\s*$/g, '');
				var form = lib.$.post(
					"/secure/CreateWorklog.jspa", {
						id: id,
						atl_token: authToken,
						worklogId: "",
						adjustEstimate: "auto",
						timeLogged: time,
						startDate: lib.toJiraDate(lib.now()),
						comment: description
					}, function (response) {
						var newTimeSpent = (response
							.match(/<dd id="tt_single_values_spent"[^>]+>\s*([\dhm., ]+?)\s*<\/dd>/) || [null, null])[1];

						if (newTimeSpent == null) {
							lib.$('body').append(lib.$('<textarea>').text(response));
							return;
						}

						if (oldTimeSpent == newTimeSpent) {
							alert(lib._("Can't log spent time. Trying again..."));

							increaseTime(id, authToken, time, description);
						} else {
							location.reload(true);
						}
					});
			}

			var stopIssue = function (id, authToken, firstTry) {
				lib.$.get(
					"/secure/WorkflowUIDispatcher.jspa", {
						id: id,
						action: 301,
						atl_token: authToken
					}, function (response) {
						if (firstTry) {
							lib.setCookie('jira4_worklog_last_token_first', authToken);
							lib.setCookie('jira4_worklog_last_token_second', "none");
						} else {
							lib.setCookie('jira4_worklog_last_token_second', authToken);
						}
						if (response.match(/Session Expired/i)) {
							lib.setCookie('jira4_worklog_last_token_first', "");
							lib.setCookie('jira4_worklog_last_token_second', "");
							var newToken = (response.
								match(/name="atl_token"\s+value="([^"]*)"/) || [null, null])[1];

							if (newToken && firstTry) {
								stopIssue(id, newToken, false);
							} else {
								alert(lib._("Your session has expired, please " +
									"try to reload a page or relogin to Jira."));
							}
						} else {
							if (stopOnly) {
								location.reload(true);
							} else {
								increaseTime(id, authToken,
									ui.spentTimeFinalIndicator.val(),
									ui.worklogDescription.val());
							}
						}
					}
				);
			}

			lib.setCookie("issue_in_progress", 0);
			stopIssue(issue.id, token, true);
		};

		ui.worklogSubmit.click(function (e) {
			e.preventDefault();
			commitWorklog(false);
		})

		ui.worklogSubmitSkip.click(function (e) {
			e.preventDefault();
			if (confirm(lib._("Are you really wish to stop progress without tracking spended time?"))) {
				commitWorklog(true);
			}
		});

		ui.worklogForm.submit(function (e) {
			e.preventDefault();
			ui.worklogSubmit.click();
		})

		ui.spentTimeIndicator.keyup(function () {
			ui.spentTimeFinalIndicator.val(lib.$(this).val());
		});

		ui.commentButton.click(function () {
			ui.worklogForm.hide();
		});

		lib.$(document).keyup(function (e) {
			if (e.keyCode == hotkeys.startStopProgress) {
				if (lib.isTyping()) {
					return ;
				} else {
					ui.stopProgressButton.click();
				}
			} else if (e.keyCode == hotkeys.esc) {
				ui.worklogForm.hide();
			}
		});
	}

	if (page.startProgress) {
		lib.$("#action_id_301").parent().addClass("last");

		ui.startProgressButton.click(function () {
			lib.setCookie("worklog_started", lib.now().getTime());
			lib.setCookie("issue_in_progress", 1);
		});

		lib.$(document).keyup(function (e) {
			if (e.keyCode == hotkeys.startStopProgress) {
				if (lib.isTyping()) {
					return ;
				} else {
					ui.startProgressButton.click();
				}
				window.location = ui.startProgressButton.attr('href');
			}
		});
	}

	lib.$(':input').keyup(function (e) {
		if (e.keyCode == hotkeys.startStopProgress) {
			if (lib.isTyping()) {
				return ;
			} else {
				e.stopPropagation();
			}
		}
	});

	//
	// Adds hotkey info in standart JIRA help panel.
	//
	(function () {
		setTimeout(arguments.callee, 100);
		var container = lib.$("body > div#shortcut-dialog").filter(":last");
		var text = lib._("Start / Stop Progress") + ":";
		if (container.length) {
			var alreadyInserted = container.
					find("dt:contains(" + text + ")").length;
			if (alreadyInserted) {
				return;
			}
			container.find("#shortcutsmenu .module:eq(1) .item-details").
						append("<li><dl>" +
							"<dt>" + text + "</dt>" +
							"<dd><kbd>s</kbd></dd>" +
							"</dl></li>");
		}
	}());

	//
	// Styles section.
	//
	var styles = {
		"#worklog-spent-time": [
			"border: 1px solid #ddd",
			"border-bottom-right-radius: 0.25em",
			"border-top-right-radius: 0.25em",
			"-moz-border-radius-bottomright: 0.25em",
			"-moz-border-radius-topright: 0.25em",
			"border-left: none",
			"color: #bbb",
			"height: 1.5em",
			"padding-left: 2px",
			"width: 60px",
			"float: right",
			"display: block",
			"font-size: 1.162em"
		],
		"#worklog-spent-time.focused": [
			"background: lemonchiffon"
		],
		"#worklog-spent-time.changed": [
			"color: black"
		],
		"#worklog-form": [
			"clear: both",
			"display: none",
			"padding: 10px 8px 0 0"
		],
		"#stalker.action #worklog-form": [
			"display: block",
		],
		"#stalker #worklog-form div label:after": [
			"content: \":\""
		],
		"#stalker #worklog-form div label": [
			"clear: left",
			"float: left",
			"margin-right: 5px"
		],
		"#stalker #worklog-form  textarea": [
			"max-height: 350px",
			"width: 99%"
		],
		"#worklog-form #worklog-spent-time-final": [
			"width: 5em"
		],
		"#stalker #worklog-form .submit": [
			"margin-bottom: 0",
			"padding-bottom: 0"
		]
	};

	for (selector in styles) {
		lib.style(selector, styles[selector]);
	}
};

(function (callback) {
	var script = document.createElement("script");
	script.textContent = "(" + callback.toString() + ")();";
	document.body.appendChild(script);
}(script));
}());
