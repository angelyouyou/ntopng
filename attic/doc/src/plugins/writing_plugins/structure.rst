Structure
=========

A plugin is a collection of Lua scripts organized in a well-defined
tree of directories.

The most complete example of plugin structure is the following

.. code:: bash

   example/
   |-- alert_definitions
   |   `-- alert_example.lua
   |-- alert_endpoints
   |   |-- example.lua
   |   `-- prefs_entries.lua
   |-- http_lint.lua
   |-- locales
   |   `-- en.lua
   |-- manifest.lua
   |-- status_definitions
   |   `-- status_example.lua
   |-- user_scripts
   |   |-- flow
   |   |   `-- example.lua
   |   |-- host
   |   |   `-- example.lua
   |   |-- interface
   |   |   `-- example.lua
   |   |-- network
   |   |   `-- example.lua
   |   |-- snmp_device
   |   |   `-- example.lua
   |   `-- system
   |       `-- example.lua
   `-- web_gui
       |-- example_page.lua
       `-- menu.lua

The root directory :code:`example` should have a name which is
representative for the plugin. Sub-directories contain:

- :code:`alert_definitions`: files for the definition of alerts
  generated by the plugin. If the plugin does not generate alerts,
  this directory can be omitted from the structure.
- :code:`alert_endpoints`: files to create alert endpoints. An alert
  endpoint is called by ntopng every time an alert is
  generated. Creating alert endpoints allows complete flexibility to
  handle alerts as one can decide to do post processing or deliver
  them to any downstream store. If the plugin does not want to create
  alert endpoints, this directory can be omitted from the structure.
- :code:`locales`: files for the localization of strings used within the plugin,
  such as the description of a generated alert. When this directory is
  omitted, strings found in the plugin will be taken verbatim.
- :code:`status_definitions`: files for the definition of flow
  statuses set by the plugin. A plugin may decide to set a status
  (e.g., a blacklisted flow status, see :ref:`Blacklisted Flows`) for a flow when it detects a certain
  condition on it. If the plugin does not set flow statuses, this
  directory can be omitted from the structure.
- :code:`user_scripts`: files with the business logic necessary to
  perform certain custom actions. This directory contains additional
  sub-directories, namely, :code:`flow`, :code:`host`, :code:`interface`, :code:`network`,
  :code:`snmp_device`, and :code:`sytem`. ntopng guarantees files
  found under the :code:`flow` directory will be executed for every
  flow (see :ref:`Flow User Scripts`); files
  found under the :code:`host` directory will be executed for every
  host (see :ref:`Host User Scripts`); and so on.
  Sub-directories can be missing or empty, depending
  on whether the plugins wants to perform certain actions or not.
- :code:`web_gui`: file to create custom ntopng pages and link them in
  the main ntopng menu.

The whole list of ntopng community plugins is available on the `ntopng
GitHub plugins page
<https://github.com/ntop/ntopng/tree/dev/scripts/plugins>`_. Having a
look of existing community plugins is a good starting point for those
who look for real plugin examples at those documented in the :ref:`Plugin
Examples`.

The remainder of this section delves into the details of plugins creation.
