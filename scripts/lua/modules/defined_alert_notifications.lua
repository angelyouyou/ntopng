--
-- (C) 2020 - ntop.org
--
local dirs = ntop.getDirs()
local info = ntop.getInfo()
local prefs = ntop.getPrefs()

local defined_alert_notifications = {}
local telemetry_utils = require("telemetry_utils")
local alert_notification = require("alert_notification")

local ALARM_THRESHOLD_LOW = 60
local ALARM_THRESHOLD_HIGH = 90

--
-- NOTE
-- scripts/lua/modules/menu_alert_notifications.lua will call all NON-LOCAL functions in this file in sequence
-- each function will displaya badge if required
--

local function create_geo_ip_alert_notification()
    local title = i18n("geolocation_unavailable_title")
    local description = i18n("geolocation_unavailable", {url = "https://github.com/ntop/ntopng/blob/dev/doc/README.geolocation.md", target = "_blank", icon = "fas fa-external-link-alt"})

    return alert_notification:create("geoip_alert", title, description, "warning", nil, "nedge/system_setup/")
end

-- ###############################################################

local function create_contribute_alert_notification()
    local title = i18n("about.contribute_to_project")
    local description = i18n("about.telemetry_data_opt_out_msg", {tel_url=ntop.getHttpPrefix().."/lua/telemetry.lua", ntop_org="https://www.ntop.org/"})
    local action = {
        url = ntop.getHttpPrefix() .. '/lua/admin/prefs.lua?tab=telemetry',
        title = i18n("configure")
    }

    return alert_notification:create("contribute_alert", title, description, "info", action, "/lua/admin/prefs.lua")
end

-- ###############################################################

local function create_tempdir_alert_notification()
    local title = i18n("warning")
    local description = i18n("about.datadir_warning")
    local action = {
        url = "https://www.ntop.org/support/faq/migrate-the-data-directory-in-ntopng/"
    }

    return alert_notification:create("tempdir_alert", title, description, "warning", action)
end

-- ###############################################################

local function create_update_ntopng_notification(body)
    local title = i18n("update")
    return alert_notification:create("update_alert", title, body, "info")
end

-- ###############################################################

local function create_too_many_flows_notification(level)
    local title = i18n("too_many_flows")
    local desc = i18n("about.you_have_too_many_flows", {product=info["product"]})

    return alert_notification:create("toomanyflows_alert", title, desc, level)
end

-- ###############################################################

local function create_too_many_hosts_notification(level)
    local title = i18n("too_many_hosts")
    local desc = i18n("about.you_have_too_many_hosts", {product=info["product"]})

    return alert_notification:create("toomanyhosts_alert", title, desc, level)
end

-- ###############################################################

local function create_remote_probe_clock_drift_notification(level)
    local title = i18n("remote_probe_clock_drift")
    local desc = i18n("about.you_need_to_sync_remote_probe_time", {url=ntop.getHttpPrefix().."/lua/if_stats.lua"})

    return alert_notification:create("remoteprobleclockdrift_alert", title, desc, level)
end

-- ##################################################################

local function create_flow_dump_alert_notification()
    local title = i18n("flow_dump_not_working_title")
    local description = i18n("flow_dump_not_working", {icon = "fas fa-external-link-alt"})
    return alert_notification:create("flow_dump_alert", title, description, "warning")
end

-- ##################################################################

--- Create an instance for the geoip alert notification
--- if the user doesn't have geoIP installed
--- @param container table The table where the notification will be inserted
function defined_alert_notifications.geo_ip(container)
    if isAdministrator() and not ntop.hasGeoIP() then
        table.insert(container, create_geo_ip_alert_notification())
    end
end

--- Create an instance for the temp working directory alert
--- if ntopng is running inside /var/tmp
--- @param container table The table where the notification will be inserted
function defined_alert_notifications.temp_working_dir(container)
    if (dirs.workingdir == "/var/tmp/ntopng") then
        table.insert(container, create_tempdir_alert_notification())
    end
end

--- Create an instance for contribute alert notification
--- @param container table The table where the notification will be inserted
function defined_alert_notifications.contribute(container)
    if (not info.oem) and (not telemetry_utils.dismiss_notice()) then
        table.insert(container, create_contribute_alert_notification())
    end
end

-- ###############################################################

function defined_alert_notifications.update_ntopng(container)
    -- check if ntopng is oem and the user is an Administrator
    local is_not_oem_and_administrator = isAdministrator() and not info.oem
    local message = check_latest_major_release()

    if is_not_oem_and_administrator and not isEmptyString(message) then
        table.insert(container, create_update_ntopng_notification(message))
    end
end

-- ###############################################################

function defined_alert_notifications.too_many_hosts(container)
    local level = nil
    local hosts = interface.getNumHosts()
    local hosts_pctg = math.floor(1 + ((hosts * 100) / prefs.max_num_hosts))

    if (hosts_pctg >= ALARM_THRESHOLD_LOW and hosts_pctg <= ALARM_THRESHOLD_HIGH) then
        level = "warning"
    elseif (hosts_pctg > ALARM_THRESHOLD_HIGH) then
        level = "danger"
    end

    if (level ~= nil) then
        table.insert(container, create_too_many_hosts_notification(level))
    end
end

-- ###############################################################

function defined_alert_notifications.too_many_flows(container)
    local level = nil
    local flows = interface.getNumFlows()
    local flows_pctg = math.floor(1 + ((flows * 100) / prefs.max_num_flows))

    if (flows_pctg >= ALARM_THRESHOLD_LOW and flows_pctg <= ALARM_THRESHOLD_HIGH) then
        level = "warning"
    elseif (flows_pctg > ALARM_THRESHOLD_HIGH) then
        level = "danger"
    end

    if (level ~= nil) then
        table.insert(container, create_too_many_flows_notification(level))
    end
end

-- ###############################################################

function defined_alert_notifications.remote_probe_clock_drift(container)
   local ifstats = interface.getStats()

   if(ifstats["probe.remote_time"] ~= nil) then
      local tdiff = math.abs(os.time()-ifstats["probe.remote_time"])
      local level = nil
      
      if (tdiff >= 10 and tdiff <= 30) then
	 level = "warning"
      elseif (tdiff > 30) then
	 level = "danger"
      end
      
      if (level ~= nil) then
	 table.insert(container, create_remote_probe_clock_drift_notification(level))
      end
   end
end

-- ###############################################################

--- Create an instance for the nIndex alert notification
--- if nIndex is not able to start/run/dump
--- @param container table The table where the notification will be inserted
function defined_alert_notifications.flow_dump(container)
    if isAdministrator() and
       prefs.is_dump_flows_enabled and
       prefs.is_dump_flows_runtime_enabled and
       not interface.isFlowDumpDisabled and
       not interface.isFlowDumpRunning then
        table.insert(container, create_flow_dump_alert_notification())
    end
end

-- ###############################################################

return defined_alert_notifications

