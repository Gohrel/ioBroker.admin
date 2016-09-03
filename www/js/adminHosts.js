function Hosts(main) {
    'use strict';

    var that      = this;
    this.main     =   main;
    this.list     = [];
    this.$grid    = $('#grid-hosts');

    this.prepare = function () {
        $('#btn-hosts-reload').button({
            icons: {primary: 'ui-icon-refresh'},
            text:  false
        }).css({width: '1.5em', height: '1.5em'}).attr('title', _('Update')).click(function () {
            that.init(true);
        });

        $('#hosts-filter-clear').button({icons: {primary: 'ui-icon-close'}, text: false}).css({width: '1em', height: '1em'}).click(function () {
            $('#hosts-filter').val('').trigger('change');
        });

        $('#hosts-filter').change(function () {
            that.main.saveConfig('hostsFilter', $(this).val());
            applyFilter($(this).val());
        }).keyup(function () {
            if (that.filterTimeout) clearTimeout(that.filterTimeout);
            that.filterTimeout = setTimeout(function () {
                $('#hosts-filter').trigger('change');
            }, 300);
        });
        if (that.main.config.hostsFilter && that.main.config.hostsFilter[0] != '{') {
            $('#hosts-filter').val(that.main.config.hostsFilter);
        }
    };

    // ----------------------------- Hosts show and Edit ------------------------------------------------
    this.initList = function (isUpdate) {

        if (!that.main.objectsLoaded) {
            setTimeout(function () {
                that.initList(isUpdate);
            }, 250);
            return;
        }

        // fill the host list (select) on adapter tab
        var $selHosts = $('#host-adapters');
        var selHosts  = $selHosts[0];
        var myOpts    = selHosts.options;
        if (!isUpdate && $selHosts.data('inited')) return;

        $selHosts.data('inited', true);

        that.main.currentHost = that.main.currentHost || that.main.config.currentHost || '';

        var found;
        var j;
        // first remove non-existing hosts
        for (var i = 0; i < myOpts.length; i++) {
            found = false;
            for (j = 0; j < that.list.length; j++) {
                if (that.list[j] === myOpts[i].value) {
                    found = true;
                    break;
                }
            }
            if (!found) selHosts.remove(i);
        }

        for (i = 0; i < that.list.length; i++) {
            found = false;
            for (j = 0; j < myOpts.length; j++) {
                if (that.list[i].name === myOpts[j].value) {
                    found = true;
                    break;
                }
            }
            if (!found) $selHosts.append('<option value="' + that.list[i].name + '">' + that.list[i].name + '</option>');
        }

        if (that.main.currentHost) {
            $selHosts.val(that.main.currentHost);
            that.main.tabs.adapters.init(true);
            that.main.tabs.instances.init(true);
        } else if ($selHosts.val() !== that.main.currentHost) {
            that.main.currentHost = $selHosts.val();
            that.main.tabs.adapters.init(true);
            that.main.tabs.instances.init(true);
        }

        $selHosts.unbind('change').change(function () {
            if (!that.main.states['system.host.' + $(this).val() + '.alive'] ||
                !that.main.states['system.host.' + $(this).val() + '.alive'].val ||
				 that.main.states['system.host.' + $(this).val() + '.alive'].val === 'null') {
                that.main.showMessage(_('Host %s is offline', $(this).val()));
                $(this).val(that.main.currentHost);
                return;
            }

            that.main.currentHost = $(this).val();

            that.main.saveConfig('currentHost', that.main.currentHost);
            that.main.tabs.adapters.init(true);
            that.main.tabs.instances.init(true);
        });
        that.init();
    };
    
    this.initButtons = function () {

        $('.host-update-submit').button({icons: {primary: 'ui-icon-refresh'}}).unbind('click').on('click', function () {
            that.main.cmdExec($(this).attr('data-host-name'), 'upgrade self', function (exitCode) {
                if (!exitCode) that.init(true);
            });
        });

        $('.host-restart-submit').button({icons: {primary: 'ui-icon-refresh'}, text: false}).css({width: 22, height: 18}).unbind('click').on('click', function () {
            main.waitForRestart = true;
            main.cmdExec($(this).attr('data-host-name'), '_restart');
        });
    };

    function applyFilter(filter) {
        filter = filter.toLowerCase().trim();
        var index = 0;
        if (!filter) {
            $('.hosts-host').each(function () {
                if (index & 1) {
                    $(this).removeClass('hosts-even').addClass('hosts-odd');
                } else {
                    $(this).removeClass('hosts-odd').addClass('hosts-even');
                }
                index++;
            });
        } else {
            $('.hosts-host').each(function () {
                var $this = $(this);
                var found = false;
                $this.find('td').each(function () {
                    var text = $(this).text();
                    if (text.toLowerCase().indexOf(filter) !== -1) {
                        found = true;
                        return false;
                    }
                });
                if (!found) {
                    $this.hide();
                } else {
                    $this.show();
                }
                if (index & 1) {
                    $(this).removeClass('hosts-even').addClass('hosts-odd');
                } else {
                    $(this).removeClass('hosts-odd').addClass('hosts-even');
                }
                index++;
            });
        }
    }

    function showOneHost(index) {
        var obj   = main.objects[that.list[index].id];
        var alive = main.states[obj._id + '.alive'] && main.states[obj._id + '.alive'].val && main.states[obj._id + '.alive'].val !== 'null';

        var text = '<tr class="hosts-host " data-host-id="' + obj._id + '">';
        //LED
        text += '<td><div class="hosts-led ' + (alive ? 'led-green' : 'led-red') + '" style="margin-left: 0.5em; width: 1em; height: 1em;" data-host-id="' + obj._id + '"></div></td>';
        // name
        text += '<td class="hosts-name" style="font-weight: bold">' + obj.common.hostname +
                '<button class="host-restart-submit" style="float: right; ' + (alive ? '' : 'display: none') + '" data-host-id="' + obj._id + '" title="' + _('restart') + '"></button></td>' +
            + '</td>';
        // type
        text += '<td>' + obj.common.type + '</td>';
        // description
        text += '<td>' + obj.common.title + '</td>';
        // platform
        text += '<td>' + obj.common.platform + '</td>';
        // OS
        text += '<td>' + obj.native.os.platform + '</td>';
        // Available
        text += '<td><span data-host-id="' + obj._id + '" data-type="' + obj.common.type + '" class="hosts-version-available"></span>' +
            ' <button class="host-update-submit" data-host-name="' + obj.common.hostname + '" style="display: none; opacity: 0; float: right" title="' + _('update') + '"></button>' +
            '</td>';

        // installed
        text += '<td class="hosts-version-installed" data-host-id="' + obj._id + '">' + obj.common.installedVersion + '</td>';

        text += '</tr>';

        return text;
    }

    function showHosts() {
        var text = '';
        for (var i = 0; i < that.list.length; i++) {
            text += showOneHost(i);
        }
        that.$grid.html(text);
    }

    this.init = function(update, updateRepo, callback) {

        if (!this.main.objectsLoaded) {
            setTimeout(function () {
                that.init(update, updateRepo, callback)
            }, 250);
            return;
        }

        if (typeof that.$grid !== 'undefined' && (!that.$grid.data('inited') || update)) {
            $('a[href="#tab-hosts"]').removeClass('updateReady');
            that.$grid.data('inited', true);
            showHosts();
            applyFilter($('#hosts-filter').val());

            that.main.tabs.adapters.getAdaptersInfo(that.main.currentHost, update, updateRepo, function (repository, installedList) {
                if (!installedList || !installedList.hosts) return;

                for (var id in installedList.hosts) {
                    if (!installedList.hosts.hasOwnProperty(id)) continue;
                    var obj = main.objects['system.host.' + id];
                    var installed = installedList.hosts[id].version;
                    if (installed !== installedList.hosts[id].runningVersion) installed += '(' + _('Running: ') + installedList.hosts[id].runningVersion + ')';
                    if (!installed && obj.common && obj.common.installedVersion) installed = obj.common.installedVersion;

                    id = 'system.host.' + id.replace(/ /g, '_');
                    $('.hosts-version-installed[data-host-id="' + id + '"]').html(installed);
                }

                $('.hosts-host').each(function () {
                    var id = $(this).data('host-id');
                    var obj = that.main.objects[id];
                    var installedVersion = obj.common.installedVersion;
                    var availableVersion = obj.common ? (repository && repository[obj.common.type] ? repository[obj.common.type].version : '') : '';
                    if (installedVersion && availableVersion) {
                        if (!main.upToDate(availableVersion, installedVersion)) {
                            // show button
                            if (that.main.states[id + '.alive'] && that.main.states[id + '.alive'].val && that.main.states[id + '.alive'].val !== 'null') {
                                $(this).find('.host-update-submit').show();
                                $(this).find('.hosts-version-installed').addClass('updateReady');
                                $('a[href="#tab-hosts"]').addClass('updateReady');
                            }
                        }
                    }
                    if (availableVersion) {
                        $(this).find('.hosts-version-available').html(availableVersion);
                    }
                });


                that.initButtons();
                if (callback) callback();
            });
        }
    };
    
    this.resize = function (width, height) {
        this.$grid.setGridHeight(height - 150).setGridWidth(width - 20);
    };

    this.objectChange = function (id, obj) {
        // Update hosts
        if (id.match(/^system\.host\.[-\w]+$/)) {
            var found = false;
            var i;
            for (i = 0; i < this.list.length; i++) {
                if (this.list[i].id === id) {
                    found = true;
                    break;
                }
            }

            if (obj) {
                if (!found) this.list.push({id: id, address: obj.common.address ? obj.common.address[0]: '', name: obj.common.name});
            } else {
                if (found) this.list.splice(i, 1);
            }
            
            if (this.updateTimer) clearTimeout(this.updateTimer);

            this.updateTimer = setTimeout(function () {
                that.updateTimer = null;
                that.init(true);
                that.initList(true);
            }, 200);
        }
    };
    this.stateChange = function (id, state) {
        if (id.match(/^system\.host\..+\.alive$/)) {
            id = id.substring(0, id.length - 6);
            if (state && state.val) {
                $('.hosts-led[data-host-id="' + id + '"]').removeClass('led-red').addClass('red-green');
            } else {
                $('.hosts-led[data-host-id="' + id + '"]').removeClass('led-green').addClass('red-red');
                $('.host-update-submit[data-host-id="' + id + '"]').hide();
                $('.host-restart-submit[data-host-id="' + id + '"]').hide();
            }
        }
    };
}

