// jQuery Cron Builder for Hangfire (Modern JS Refactor)
// Originally based on jQuery Cron Builder by https://github.com/juliacscai

(($) => {
    "use strict";

    // HTML structure and input templates for each cron period
    const cronInputs = {
        period: `
            <div class="cron-select-period">
                <label></label>
                <select class="cron-period-select"></select>
            </div>
        `,
        startTime: `
            <div class="cron-input cron-start-time">
                Start time 
                <select class="cron-clock-hour"></select>:
                <select class="cron-clock-minute"></select>
            </div>
        `,
        container: '<div class="cron-input"></div>',
        minutes: {
            tag: 'cron-minutes',
            inputs: [
                '<p>Every <select class="cron-minutes-select"></select> minute(s)</p>'
            ]
        },
        hourly: {
            tag: 'cron-hourly',
            inputs: [
                '<p><input type="radio" name="hourlyType" value="every"> Every <select class="cron-hourly-select"></select> hour(s)</p>',
                '<p><input type="radio" name="hourlyType" value="clock"> Every day at <select class="cron-hourly-hour"></select>:<select class="cron-hourly-minute"></select></p>'
            ]
        },
        daily: {
            tag: 'cron-daily',
            inputs: [
                '<p><input type="radio" name="dailyType" value="every"> Every <select class="cron-daily-select"></select> day(s)</p>',
                '<p><input type="radio" name="dailyType" value="clock"> Every week day</p>'
            ]
        },
        weekly: {
            tag: 'cron-weekly',
            inputs: [
                `<p>
                    <input type="checkbox" name="dayOfWeekMon"> Monday  
                    <input type="checkbox" name="dayOfWeekTue"> Tuesday  
                    <input type="checkbox" name="dayOfWeekWed"> Wednesday  
                    <input type="checkbox" name="dayOfWeekThu"> Thursday
                </p>`, 
                `<p>
                    <input type="checkbox" name="dayOfWeekFri"> Friday  
                    <input type="checkbox" name="dayOfWeekSat"> Saturday  
                    <input type="checkbox" name="dayOfWeekSun"> Sunday
                </p>`
            ]
        },
        monthly: {
            tag: 'cron-monthly',
            inputs: [
                `<p>
                    <input type="radio" name="monthlyType" value="byDay"> 
                    Day <select class="cron-monthly-day"></select> of every <select class="cron-monthly-month"></select> month(s)
                </p>`,
                `<p>
                    <input type="radio" name="monthlyType" value="byWeek"> 
                    The <select class="cron-monthly-nth-day"></select> 
                    <select class="cron-monthly-day-of-week"></select> of every <select class="cron-monthly-month-by-week"></select> month(s)
                </p>`
            ]
        }
    };

    const arrayToOptions = (opts, values = null) =>
        opts.map((opt, i) => {
            const value = values ? values[i] : opt;
            return `<option value='${value}'>${opt}</option>\n`;
        }).join('');

    const rangeToOptions = (start, end, isClock = false) =>
        Array.from({ length: end - start + 1 }, (_, i) => {
            const val = start + i;
            const label = isClock && val < 10 ? `0${val}` : val;
            return `<option value='${val}'>${label}</option>\n`;
        }).join('');

    const addInputElements = ($baseEl, inputObj, onFinish) => {
        $(cronInputs.container).addClass(inputObj.tag).appendTo($baseEl);
        $baseEl.children(`.${inputObj.tag}`).append(inputObj.inputs);
        if (typeof onFinish === "function") onFinish();
    };

    const periodOpts = arrayToOptions(["Minutes", "Hourly", "Daily", "Weekly", "Monthly"]);
    const minuteOpts = rangeToOptions(1, 60);
    const hourOpts = rangeToOptions(1, 24);
    const dayOpts = rangeToOptions(1, 100);
    const minuteClockOpts = rangeToOptions(0, 59, true);
    const hourClockOpts = rangeToOptions(0, 23, true);
    const dayInMonthOpts = rangeToOptions(1, 31);
    const monthNumOpts = rangeToOptions(1, 12);
    const nthWeekOpts = arrayToOptions(["First", "Second", "Third", "Forth"], [1, 2, 3, 4]);
    const dayOfWeekOpts = arrayToOptions(
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    );

    const eventHandlers = {
        periodSelect() {
            const period = $(this).val();
            const $selector = $(this).parent();
            $selector.siblings('div.cron-input').hide();
            $selector.siblings().find("select option").removeAttr("selected");
            $selector.siblings().find("select option:first").attr("selected", "selected");
            $selector.siblings('div.cron-start-time').show();
            $selector.siblings('div.cron-start-time').children("select.cron-clock-hour").val('12');
            switch (period) {
                case 'Minutes':
                    $selector.siblings('div.cron-minutes')
                        .show()
                        .find("select.cron-minutes-select").val('1');
                    $selector.siblings('div.cron-start-time').hide();
                    break;
                case 'Hourly': {
                    const $hourlyEl = $selector.siblings('div.cron-hourly');
                    $hourlyEl.show()
                        .find("input[name=hourlyType][value=every]").prop('checked', true);
                    $hourlyEl.find("select.cron-hourly-hour").val('12');
                    $selector.siblings('div.cron-start-time').hide();
                    break;
                }
                case 'Daily': {
                    const $dailyEl = $selector.siblings('div.cron-daily');
                    $dailyEl.show()
                        .find("input[name=dailyType][value=every]").prop('checked', true);
                    break;
                }
                case 'Weekly':
                    $selector.siblings('div.cron-weekly')
                        .show()
                        .find("input[type=checkbox]").prop('checked', false);
                    break;
                case 'Monthly': {
                    const $monthlyEl = $selector.siblings('div.cron-monthly');
                    $monthlyEl.show()
                        .find("input[name=monthlyType][value=byDay]").prop('checked', true);
                    break;
                }
            }
        }
    };

    class CronBuilder {
        constructor(el, options) {
            this.$el = $(el);
            this.el = el;
            this.$el.data('cronBuilder', this);
            this.options = { ...$.cronBuilder.defaultOptions, ...options };
            this.init();
        }

        init() {
            this.$el.append(cronInputs.period);
            this.$el.find("div.cron-select-period label").text(this.options.selectorLabel);
            this.$el.find("select.cron-period-select")
                .append(periodOpts)
                .on("change", eventHandlers.periodSelect);

            addInputElements(this.$el, cronInputs.minutes, () => {
                this.$el.find("select.cron-minutes-select").append(minuteOpts);
            });

            addInputElements(this.$el, cronInputs.hourly, () => {
                this.$el.find("select.cron-hourly-select").append(hourOpts);
                this.$el.find("select.cron-hourly-hour").append(hourClockOpts);
                this.$el.find("select.cron-hourly-minute").append(minuteClockOpts);
            });

            addInputElements(this.$el, cronInputs.daily, () => {
                this.$el.find("select.cron-daily-select").append(dayOpts);
            });

            addInputElements(this.$el, cronInputs.weekly);

            addInputElements(this.$el, cronInputs.monthly, () => {
                this.$el.find("select.cron-monthly-day").append(dayInMonthOpts);
                this.$el.find("select.cron-monthly-month").append(monthNumOpts);
                this.$el.find("select.cron-monthly-nth-day").append(nthWeekOpts);
                this.$el.find("select.cron-monthly-day-of-week").append(dayOfWeekOpts);
                this.$el.find("select.cron-monthly-month-by-week").append(monthNumOpts);
            });

            this.$el.append(cronInputs.startTime);
            this.$el.find("select.cron-clock-hour").append(hourClockOpts);
            this.$el.find("select.cron-clock-minute").append(minuteClockOpts);

            if (typeof this.options.onChange === "function") {
                this.$el.find("select, input").on("change", () => {
                    this.options.onChange(this.getExpression());
                });
            }

            this.$el.find("select.cron-period-select").triggerHandler("change");
        }

        getExpression() {
            let dow = "*", month = "*", dom = "*";
            let min = this.$el.find("select.cron-clock-minute").val();
            let hour = this.$el.find("select.cron-clock-hour").val();
            const period = this.$el.find("select.cron-period-select").val();

            switch (period) {
                case 'Minutes': {
                    const $selector = this.$el.find("div.cron-minutes");
                    const nmin = $selector.find("select.cron-minutes-select").val();
                    min = nmin > 1 ? `0/${nmin}` : "*";
                    hour = "*";
                    break;
                }
                case 'Hourly': {
                    const $selector = this.$el.find("div.cron-hourly");
                    if ($selector.find("input[name=hourlyType][value=every]").is(":checked")) {
                        min = 0;
                        hour = "*";
                        const nhour = $selector.find("select.cron-hourly-select").val();
                        if (nhour > 1) hour = `0/${nhour}`;
                    } else {
                        min = $selector.find("select.cron-hourly-minute").val();
                        hour = $selector.find("select.cron-hourly-hour").val();
                    }
                    break;
                }
                case 'Daily': {
                    const $selector = this.$el.find("div.cron-daily");
                    if ($selector.find("input[name=dailyType][value=every]").is(":checked")) {
                        const ndom = $selector.find("select.cron-daily-select").val();
                        if (ndom > 1) dom = `1/${ndom}`;
                    } else {
                        dom = "*";
                        dow = "MON-FRI";
                    }
                    break;
                }
                case 'Weekly': {
                    const $selector = this.$el.find("div.cron-weekly");
                    const ndow = [];
                    if ($selector.find("input[name=dayOfWeekMon]").is(":checked")) ndow.push("MON");
                    if ($selector.find("input[name=dayOfWeekTue]").is(":checked")) ndow.push("TUE");
                    if ($selector.find("input[name=dayOfWeekWed]").is(":checked")) ndow.push("WED");
                    if ($selector.find("input[name=dayOfWeekThu]").is(":checked")) ndow.push("THU");
                    if ($selector.find("input[name=dayOfWeekFri]").is(":checked")) ndow.push("FRI");
                    if ($selector.find("input[name=dayOfWeekSat]").is(":checked")) ndow.push("SAT");
                    if ($selector.find("input[name=dayOfWeekSun]").is(":checked")) ndow.push("SUN");
                    dow = (ndow.length < 7 && ndow.length > 0) ? ndow.join(",") : "*";
                    dom = "*";
                    break;
                }
                case 'Monthly': {
                    const $selector = this.$el.find("div.cron-monthly");
                    let nmonth;
                    if ($selector.find("input[name=monthlyType][value=byDay]").is(":checked")) {
                        month = "*";
                        nmonth = $selector.find("select.cron-monthly-month").val();
                        dom = $selector.find("select.cron-monthly-day").val();
                        dow = "*";
                    } else {
                        dow = `${$selector.find("select.cron-monthly-day-of-week").val()}#${$selector.find("select.cron-monthly-nth-day").val()}`;
                        nmonth = $selector.find("select.cron-monthly-month-by-week").val();
                        dom = "*";
                    }
                    if (nmonth > 1) month = `1/${nmonth}`;
                    break;
                }
            }
            // Format: "min hour dom month dow"
            return [min, hour, dom, month, dow].join(" ");
        }
    }

    $.cronBuilder = function (el, options) {
        return new CronBuilder(el, options);
    };

    $.cronBuilder.defaultOptions = {
        selectorLabel: "Select period: "
    };

    $.fn.cronBuilder = function (options) {
        return this.each(function () {
            new CronBuilder(this, options);
        });
    };

})(jQuery);
