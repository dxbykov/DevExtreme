"use strict";

var $ = require("jquery"),
    errors = require("../../core/errors"),
    commonUtils = require("../../core/utils/common"),
    dateUtils = require("../../core/utils/date");

var toMs = dateUtils.dateToMilliseconds;

var leastDaysInWeek = 4;

var intervalMap = {
    secondly: "seconds",
    minutely: "minutes",
    hourly: "hours",
    daily: "days",
    weekly: "weeks",
    monthly: "months",
    yearly: "years"
};

var dateSetterMap = {
    "bysecond": function(date, value) {
        date.setSeconds(value);
    },
    "byminute": function(date, value) {
        date.setMinutes(value);
    },
    "byhour": function(date, value) {
        date.setHours(value);
    },
    "bymonth": function(date, value) {
        date.setMonth(value);
    },
    "bymonthday": function(date, value) {
        if(value < 0) {
            var initialDate = new Date(date);

            setDateByNegativeValue(initialDate, 1, -1);

            var daysInMonth = initialDate.getDate();

            if(daysInMonth >= Math.abs(value)) {
                setDateByNegativeValue(date, 1, value);
            } else {
                setDateByNegativeValue(date, 2, value);
            }

        } else {
            date.setDate(value);
            correctDate(date, value);
        }
    },
    "byday": function(date, dayOfWeek, weekStart) {
        dayOfWeek += days[weekStart] > dayOfWeek ? 7 : 0;
        date.setDate(date.getDate() - date.getDay() + dayOfWeek);
    },
    "byweekno": function(date, weekNumber, weekStart) {
        var initialDate = new Date(date),
            firstYearDate = new Date(initialDate.setMonth(0, 1)),
            dayShift = firstYearDate.getDay() - days[weekStart],
            firstDayOfYear = firstYearDate.getTime() - dayShift * toMs("day"),
            newFirstYearDate = dayShift + 1;

        if(newFirstYearDate > leastDaysInWeek) {
            date.setTime(firstDayOfYear + weekNumber * 7 * toMs("day"));
        } else {
            date.setTime(firstDayOfYear + (weekNumber - 1) * 7 * toMs("day"));
        }

        var timezoneDiff = (date.getTimezoneOffset() - firstYearDate.getTimezoneOffset()) * toMs("minute");
        timezoneDiff && date.setTime(date.getTime() + timezoneDiff);
    },
    "byyearday": function(date, dayOfYear) {
        date.setMonth(0, 1);
        date.setDate(dayOfYear);
    }
};

var setDateByNegativeValue = function(date, month, value) {
    date.setMonth(date.getMonth() + month);
    date.setDate(value + 1);
};

var dateGetterMap = {
    "bysecond": function(date) {
        return date.getSeconds();
    },
    "byminute": function(date) {
        return date.getMinutes();
    },
    "byhour": function(date) {
        return date.getHours();
    },
    "bymonth": function(date) {
        return date.getMonth();
    },
    "bymonthday": function(date) {
        return date.getDate();
    },
    "byday": function(date) {
        return date.getDay();
    },
    "byweekno": function(date, weekStart) {
        var daysFromYearStart,
            current = new Date(date),
            diff = leastDaysInWeek - current.getDay() + days[weekStart] - 1,
            dayInMilliseconds = toMs("day");

        if(date.getDay() < days[weekStart]) {
            diff -= 7;
        }

        current.setHours(0, 0, 0);
        current.setDate(current.getDate() + diff);
        daysFromYearStart = 1 + (current - new Date(current.getFullYear(), 0, 1)) / dayInMilliseconds;

        return Math.ceil(daysFromYearStart / 7);
    },
    "byyearday": function(date) {
        var yearStart = new Date(date.getFullYear(), 0, 0),
            timezoneDiff = date.getTimezoneOffset() - yearStart.getTimezoneOffset(),
            diff = date - yearStart - timezoneDiff * toMs("minute"),
            dayLength = toMs("day");

        return Math.floor(diff / dayLength);
    }
};

var ruleNames = ["freq", "interval", "byday", "byweekno", "byyearday", "bymonth", "bymonthday", "count", "until", "byhour", "byminute", "bysecond", "bysetpos", "wkst"],
    freqNames = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "SECONDLY", "MINUTELY", "HOURLY"],
    days = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

var getTimeZoneOffset = function() {
    return new Date().getTimezoneOffset();
};

var dateInRecurrenceRange = function(options) {
    var result = [];

    if(options.rule) {
        result = getDatesByRecurrence(options);
    }

    return !!result.length;
};

var normalizeInterval = function(freq, interval) {
    var intervalObject = {},
        intervalField = intervalMap[freq.toLowerCase()];

    intervalObject[intervalField] = interval;

    return intervalObject;
};

var getDatesByRecurrenceException = function(ruleValues) {
    var result = [];

    for(var i = 0, len = ruleValues.length; i < len; i++) {
        result[i] = getDateByAsciiString(ruleValues[i]);
    }

    return result;
};

var dateIsRecurrenceException = function(date, recurrenceException) {
    var result = false;

    if(!recurrenceException) {
        return result;
    }

    var splitDates = recurrenceException.split(","),
        exceptDates = getDatesByRecurrenceException(splitDates),
        shortFormat = /\d{8}$/;

    for(var i = 0, len = exceptDates.length; i < len; i++) {
        if(splitDates[i].match(shortFormat)) {
            var diffs = getDatePartDiffs(date, exceptDates[i]);

            if(diffs.years === 0 && diffs.months === 0 && diffs.days === 0) {
                result = true;
            }
        } else {
            if(date.getTime() === exceptDates[i].getTime()) {
                result = true;
            }
        }
    }

    return result;
};

var doNextIteration = function(date, startIntervalDate, endIntervalDate, recurrenceRule, iterationCount) {
    var matchCountIsCorrect = true,
        dateInInterval;

    endIntervalDate = endIntervalDate.getTime();

    if(recurrenceRule.until) {
        if(recurrenceRule.until.getTime() < endIntervalDate) {
            endIntervalDate = recurrenceRule.until.getTime();
        }
    }

    if(recurrenceRule.count) {
        if(iterationCount === recurrenceRule.count) {
            matchCountIsCorrect = false;
        }
    }

    if(date < startIntervalDate) {
        var intervalField = intervalMap[recurrenceRule.freq.toLowerCase()],
            interval = {};

        interval[intervalField] = 1;
        date.setDate(dateUtils.addInterval(date, interval).getDate());
    }

    dateInInterval = date.getTime() <= endIntervalDate;

    return dateInInterval && matchCountIsCorrect;
};

var getDatesByRecurrence = function(options) {
    var result = [],
        recurrenceRule = getRecurrenceRule(options.rule),
        iterationResult = {},
        rule = recurrenceRule.rule,
        recurrenceStartDate = options.start,
        iterationCount = 0,
        dateRules;

    if(!recurrenceRule.isValid || !rule.freq) {
        return result;
    }

    rule.interval = normalizeInterval(rule.freq, rule.interval);
    dateRules = splitDateRules(rule);

    var duration = options.end ? options.end.getTime() - options.start.getTime() : 0;

    getDatesByRules(dateRules, new Date(recurrenceStartDate), rule)
        .forEach(function(currentDate, i) {
            var iteration = 0;

            while(doNextIteration(currentDate, recurrenceStartDate, options.max, rule, iterationCount)) {

                iterationCount++;
                iteration++;

                if(!iterationResult[iteration]) {
                    iterationResult[iteration] = [];
                }

                if(!dateIsRecurrenceException(currentDate, options.exception)) {
                    if(currentDate.getTime() >= recurrenceStartDate.getTime() && (currentDate.getTime() + duration) >= options.min.getTime()) {
                        if(checkDateByRule(currentDate, [dateRules[i]], rule["wkst"])) {
                            iterationResult[iteration].push(currentDate);
                        }
                    }
                }

                currentDate = incrementDate(currentDate, recurrenceStartDate, rule, i);
            }
        });

    if(rule["bysetpos"]) {
        $.each(iterationResult, function(iterationIndex, iterationDates) {
            iterationResult[iterationIndex] = filterDatesBySetPos(iterationDates, rule["bysetpos"]);
        });
    }

    $.each(iterationResult, function(_, iterationDates) {
        result = result.concat(iterationDates);
    });


    result.sort(function(a, b) {
        return a - b;
    });

    return result;
};

var filterDatesBySetPos = function(dates, bySetPos) {
    var resultArray = [];

    bySetPos.split(",").forEach(function(index) {
        index = Number(index);

        var dateIndex = (index > 0) ? index - 1 : dates.length + index;

        if(dates[dateIndex]) {
            resultArray.push(dates[dateIndex]);
        }
    });

    return resultArray;
};

var correctDate = function(originalDate, date) {
    if(originalDate.getDate() !== date) {
        originalDate.setDate(date);
    }
};

var incrementDate = function(date, originalStartDate, rule, iterationStep) {
    var initialDate = new Date(date),
        needCorrect = true;

    date = dateUtils.addInterval(date, rule.interval);

    if(rule.freq === "MONTHLY") {
        var expectedDate = originalStartDate.getDate();

        if(rule["bymonthday"]) {
            expectedDate = Number(rule["bymonthday"].split(",")[iterationStep]);

            if(expectedDate < 0) {
                initialDate.setMonth(initialDate.getMonth() + 1, 1);
                dateSetterMap["bymonthday"](initialDate, expectedDate);
                date = initialDate;
                needCorrect = false;
            }
        }
        needCorrect && correctDate(date, expectedDate);
    }

    if(rule.freq === "YEARLY") {
        if(rule["byyearday"]) {
            var dayNumber = Number(rule["byyearday"].split(",")[iterationStep]);
            dateSetterMap["byyearday"](date, dayNumber);
        }

        var dateRules = splitDateRules(rule);

        for(var field in dateRules[iterationStep]) {
            dateSetterMap[field] && dateSetterMap[field](date, dateRules[iterationStep][field], rule["wkst"]);
        }
    }

    return date;
};

var getDatePartDiffs = function(date1, date2) {
    return {
        years: date1.getFullYear() - date2.getFullYear(),
        months: date1.getMonth() - date2.getMonth(),
        days: date1.getDate() - date2.getDate(),
        hours: date1.getHours() - date2.getHours(),
        minutes: date1.getMinutes() - date2.getMinutes(),
        seconds: date1.getSeconds() - date2.getSeconds()
    };
};

var getRecurrenceRule = function(recurrence) {
    var result = {
        rule: {},
        isValid: false
    };

    if(recurrence) {
        result.rule = parseRecurrenceRule(recurrence);
        result.isValid = validateRRule(result.rule, recurrence);
    }

    return result;
};

var loggedWarnings = [];

var validateRRule = function(rule, recurrence) {
    if(brokenRuleNameExists(rule) ||
        $.inArray(rule.freq, freqNames) === -1 ||
        wrongCountRule(rule) || wrongIntervalRule(rule) ||
        wrongDayOfWeek(rule) ||
        wrongByMonthDayRule(rule) || wrongByMonth(rule) ||
        wrongUntilRule(rule)) {

        logBrokenRule(recurrence);
        return false;
    }

    return true;
};

var wrongUntilRule = function(rule) {
    var wrongUntil = false,
        until = rule.until;

    if(until !== undefined && !(until instanceof Date)) {
        wrongUntil = true;
    }

    return wrongUntil;
};

var wrongCountRule = function(rule) {
    var wrongCount = false,
        count = rule.count;

    if(count && typeof count === "string") {
        wrongCount = true;
    }

    return wrongCount;
};

var wrongByMonthDayRule = function(rule) {
    var wrongByMonthDay = false,
        byMonthDay = rule["bymonthday"];

    if(byMonthDay && isNaN(parseInt(byMonthDay))) {
        wrongByMonthDay = true;
    }

    return wrongByMonthDay;
};

var wrongByMonth = function(rule) {
    var wrongByMonth = false,
        byMonth = rule["bymonth"];

    if(byMonth && isNaN(parseInt(byMonth))) {
        wrongByMonth = true;
    }

    return wrongByMonth;
};

var wrongIntervalRule = function(rule) {
    var wrongInterval = false,
        interval = rule.interval;

    if(interval && typeof interval === "string") {
        wrongInterval = true;
    }

    return wrongInterval;
};

var wrongDayOfWeek = function(rule) {
    var daysByRule = daysFromByDayRule(rule),
        brokenDaysExist = false;

    $.each(daysByRule, function(_, day) {
        if(!days.hasOwnProperty(day)) {
            brokenDaysExist = true;
            return false;
        }
    });

    return brokenDaysExist;
};

var brokenRuleNameExists = function(rule) {
    var brokenRuleExists = false;

    $.each(rule, function(ruleName) {
        if($.inArray(ruleName, ruleNames) === -1) {
            brokenRuleExists = true;
            return false;
        }
    });

    return brokenRuleExists;
};

var logBrokenRule = function(recurrence) {
    if($.inArray(recurrence, loggedWarnings) === -1) {
        errors.log("W0006", recurrence);
        loggedWarnings.push(recurrence);
    }
};

var parseRecurrenceRule = function(recurrence) {
    var ruleObject = {},
        ruleParts = recurrence.split(";");

    for(var i = 0, len = ruleParts.length; i < len; i++) {

        var rule = ruleParts[i].split("="),
            ruleName = rule[0].toLowerCase(),
            ruleValue = rule[1];

        ruleObject[ruleName] = ruleValue;
    }

    var count = parseInt(ruleObject.count);

    if(!isNaN(count)) {
        ruleObject.count = count;
    }

    if(ruleObject.interval) {
        var interval = parseInt(ruleObject.interval);
        if(!isNaN(interval)) {
            ruleObject.interval = interval;
        }
    } else {
        ruleObject.interval = 1;
    }

    if(ruleObject.freq && ruleObject.until) {
        ruleObject.until = getDateByAsciiString(ruleObject.until);
    }

    return ruleObject;
};

var getDateByAsciiString = function(string) {
    if(typeof string !== "string") {
        return string;
    }

    var arrayDate = string.match(/(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2}))?(Z)?/);

    if(!arrayDate) {
        return null;
    }

    var isUTC = arrayDate[8] !== undefined,
        currentOffset = resultUtils.getTimeZoneOffset() * 60000,
        date = new (Function.prototype.bind.apply(Date, prepareDateArrayToParse(arrayDate)))();

    if(isUTC) {
        date = new Date(date.getTime() - currentOffset);
    }

    return date;
};

var prepareDateArrayToParse = function(arrayDate) {
    arrayDate.shift();

    if(arrayDate[3] === undefined) {
        arrayDate.splice(3);
    } else {
        arrayDate.splice(3, 1);
        arrayDate.splice(6);
    }

    arrayDate[1]--;

    arrayDate.unshift(null);

    return arrayDate;
};

var daysFromByDayRule = function(rule) {
    var result = [];

    if(rule["byday"]) {
        result = rule["byday"].split(",");
    }

    return result;
};

var getAsciiStringByDate = function(date) {
    var currentOffset = resultUtils.getTimeZoneOffset() * 60000;

    date = new Date(date.getTime() + currentOffset);
    return date.getFullYear() + ('0' + (date.getMonth() + 1)).slice(-2) + ('0' + date.getDate()).slice(-2) +
        'T' + ('0' + (date.getHours())).slice(-2) + ('0' + (date.getMinutes())).slice(-2) + ('0' + (date.getSeconds())).slice(-2) + 'Z';
};

var splitDateRules = function(rule) {
    var result = [];

    if(!rule["wkst"]) {
        rule["wkst"] = "MO";
    }

    if(rule["byweekno"] && !rule["byday"]) {
        var dayNames = Object.keys(days);

        for(var i = 0; i < days[rule["wkst"]]; i++) {
            dayNames.push(dayNames.shift());
        }

        rule["byday"] = dayNames.join(",");
    }

    for(var field in dateSetterMap) {
        if(!rule[field]) {
            continue;
        }

        var ruleFieldValues = rule[field].split(","),
            ruleArray = getDateRuleArray(field, ruleFieldValues);

        result = result.length ? extendObjectArray(ruleArray, result) : ruleArray;
    }

    return result;
};

var getDateRuleArray = function(field, values) {
    var result = [];
    for(var i = 0, length = values.length; i < length; i++) {
        var dateRule = {};
        dateRule[field] = handleRuleFieldValue(field, values[i]);
        result.push(dateRule);
    }
    return result;
};

var handleRuleFieldValue = function(field, value) {
    var result = parseInt(value);

    if(field === "bymonth") {
        result -= 1;
    }

    if(field === "byday") {
        result = days[value];
    }

    return result;
};

var extendObjectArray = function(firstArray, secondArray) {
    var result = [];

    for(var i = 0, firstArrayLength = firstArray.length; i < firstArrayLength; i++) {
        for(var j = 0, secondArrayLength = secondArray.length; j < secondArrayLength; j++) {
            result.push($.extend({}, firstArray[i], secondArray[j]));
        }
    }
    return result;
};

var getDatesByRules = function(dateRules, startDate, rule) {
    var result = [];

    for(var i = 0, len = dateRules.length; i < len; i++) {
        var current = dateRules[i],
            updatedDate = new Date(startDate);

        for(var field in current) {
            dateSetterMap[field] && dateSetterMap[field](updatedDate, current[field], rule["wkst"]);
        }

        if(commonUtils.isArray(updatedDate)) {
            result = result.concat(updatedDate);
        } else {
            result.push(new Date(updatedDate));
        }
    }

    if(!result.length) {
        result.push(startDate);
    }

    return result;
};

var checkDateByRule = function(date, rules, weekStart) {
    var result = false;

    for(var i = 0; i < rules.length; i++) {
        var current = rules[i],
            currentRuleResult = true;

        for(var field in current) {
            var processNegative = field === "bymonthday" && current[field] < 0;

            if(dateGetterMap[field] && (!processNegative && current[field] !== dateGetterMap[field](date, weekStart))) {
                currentRuleResult = false;
            }
        }
        result = result || currentRuleResult;
    }
    return result || !rules.length;
};

var getRecurrenceString = function(object) {
    if(!object || !object.freq) {
        return;
    }

    var result = "";
    for(var field in object) {
        var value = object[field];

        if(field === "interval" && value < 2) {
            continue;
        }

        if(field === "until") {
            value = getAsciiStringByDate(value);
        }

        result += field + "=" + value + ";";
    }

    result = result.substring(0, result.length - 1);

    return result.toUpperCase();
};

var resultUtils = {
    getRecurrenceString: getRecurrenceString,
    getRecurrenceRule: getRecurrenceRule,
    getAsciiStringByDate: getAsciiStringByDate,
    getDatesByRecurrence: getDatesByRecurrence,
    dateInRecurrenceRange: dateInRecurrenceRange,
    getDateByAsciiString: getDateByAsciiString,
    daysFromByDayRule: daysFromByDayRule,
    getTimeZoneOffset: getTimeZoneOffset
};

module.exports = resultUtils;
