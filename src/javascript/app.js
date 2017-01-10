Ext.define("portfolio-committed-vs-delivered", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'selector_box',layout: 'hbox'},
        {xtype:'container',itemId:'display_box'}
    ],
    stateId: 'CA.techservices.portfolio-committed-vs-delivered.state', // automatically save a cookie (each app needs unique stateId)
    stateful: true,
    RELEASE_SCOPE_MSG: 'This app is designed for an Release scoped dashboard.  Please update the current dashboard to have an Release scope.',
    DATE_MISSING_MSG:  'Please select a commit date and a delivered date.',
    MAX_INITIATIVES: 40,
    integrationHeaders : {
        name : "portfolio-committed-vs-delivered"
    },
    config: {
        defaultSettings: {
            featureDoneState: 'Accepted',
            featureBlockedField: '',
            portfolioTargetLevel: 2
        }
    },
    portfolioItemStates: null,
    portfolioItemTypePaths: null,

    launch: function() {
        if (!this.isTimeboxScoped()){
            if (this.isExternal()){
                this.getSelectorBox().add({
                    xtype: 'rallyreleasecombobox',
                    listeners: {
                        select: this.updateTimeboxScope,
                        ready: this.updateTimeboxScope,
                        scope: this
                    }
                });
            } else {
                this.showAppMessage(this.RELEASE_SCOPE_MSG);
                return;
            }
        }


        this.fetchPortfolioItemTypes().then({
            success: function(types){
                this.portfolioItemTypePaths = types;
                this.initializeApp();
                this.onTimeboxScopeChange();
            },
            failure: this.showErrorNotification,
            scope: this
        });

    },
    fetchPortfolioStates: function(types){
        this.portfolioItemTypePaths = types;
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: types[0],
            success: function(model) {
                model.getField('State').getAllowedValueStore().load({
                    callback: function(records, operation, success) {
                        var states = [];
                        Ext.Array.each(records, function(allowedValue) {
                            //each record is an instance of the AllowedAttributeValue model
                            states.push(allowedValue.get('StringValue'));
                        });
                        console.log('states',states);
                        deferred.resolve(states);
                    }
                });
            }
        });

        return deferred;
    },
    fetchPortfolioItemTypes: function(){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store', {
            model: 'TypeDefinition',
            fetch: ['TypePath', 'Ordinal','Name'],
            filters: [
                {
                    property: 'Parent.Name',
                    operator: '=',
                    value: 'Portfolio Item'
                },
                {
                    property: 'Creatable',
                    operator: '=',
                    value: 'true'
                }
            ],
            sorters: [{
                property: 'Ordinal',
                direction: 'ASC'
            }]
        }).load({
            callback: function(records, operation, success){
                if (success){
                    var types = Ext.Array.map(records, function(r){ return r.get('TypePath'); });
                    deferred.resolve(types);
                } else {
                    var error_msg = '';
                    if (operation && operation.error && operation.error.errors){
                        error_msg = operation.error.errors.join(',');
                    }
                    deferred.reject('Error loading Portfolio Item Types:  ' + error_msg);
                }
            }
        });

        return deferred;
    },

    showErrorNotification: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    isTimeboxScoped: function(){
        return this.getContext().getTimeboxScope() && this.getContext().getTimeboxScope().getType() === 'release' || false;
    },
    updateTimeboxScope: function(cb){
        if (cb.getRecord()){
            var timeboxScope = Ext.create('Rally.app.TimeboxScope', {
                record: cb.getRecord(),
                type: 'release'
            });
            this.onTimeboxScopeChange(timeboxScope);
        }
    },
    onTimeboxScopeChange: function(timeboxScope) {

        if (!timeboxScope){
            timeboxScope = this.getContext().getTimeboxScope();
        }
        this.logger.log('onTimeboxScopeChange',timeboxScope);
        if(timeboxScope && timeboxScope.getType() === 'release') {
            this.getContext().setTimeboxScope(timeboxScope);
            if (timeboxScope.getRecord()){
                var commitDate = Rally.util.DateTime.add(timeboxScope.getRecord().get('ReleaseStartDate'),'week',3);
                if ( commitDate > new Date()){
                    commitDate = new Date();
                }
                this.down('#commitDate').setValue(commitDate);
                this.down('#deliveredDate').setValue(new Date());
            }
            this.updateView();
        }
    },
    showAppMessage: function(msg){
        this.getDisplayBox().add({
            xtype: 'container',
            html: Ext.String.format('<div class="no-data-container"><div class="secondary-message">{0}</div></div>',msg)
        });
    },
    getSelectorBox: function(){
        return this.down('#selector_box');
    },
    getDisplayBox: function(){
        return this.down('#display_box');
    },
    getCommitDate: function(){
        return Rally.util.DateTime.toIsoString(this.down('#commitDate').getValue());
    },
    getDeliveredDate: function(){
        return Rally.util.DateTime.toIsoString(this.down('#deliveredDate').getValue());
    },
    initializeApp: function(){
        this.getSelectorBox().add({
            xtype: 'rallydatefield',
            fieldLabel: 'Date 1',
            itemId: 'commitDate',
            labelAlign: 'right',
            stateful: true,
            stateId: 'commit-date',
            maxValue: new Date(),
            listeners: {
                select: this.updateView,
                scope: this
            }
        });

        this.getSelectorBox().add({
            xtype: 'rallydatefield',
            fieldLabel: 'Date 2',
            itemId: 'deliveredDate',
            stateful: true,
            stateId: 'delivered-date',
            labelAlign: 'right',
            maxValue: new Date(),
            listeners: {
                select: this.updateView,
                scope: this
            }
        });

        var keys = Ext.Object.getKeys(this.getInitiativeHash()),
            buttonCls = keys.length > 0 ? 'primary' : 'secondary',
            button = this.getSelectorBox().add({
                xtype: 'rallybutton',
                itemId: 'selectPI',
                iconCls: 'icon-portfolio',
                cls: 'rly-small ' + buttonCls,
                margin: '0 0 0 5',
                toolTipText: "Select Portfolio Items"
            });
            button.on('click', this.selectPortfolioItems, this);

        var clearBtn = this.getSelectorBox().add({
            xtype: 'rallybutton',
            itemId: 'clearPI',
            text: 'Clear All',
            cls: 'rly-small secondary',
            visible: false,
            toolTipText: "Clear all portfolio item selections"
        });
        clearBtn.on('click',this.updateSelectedPortfolioItems, this);
        this.logger.log('buttonCls', buttonCls);
        clearBtn.setVisible(buttonCls === 'primary');

    },
    getTargetPortfolioLevel: function(){
        var target = this.getSetting('portfolioTargetLevel');
        if (target && target < this.portfolioItemTypePaths.length - 1){
            return target;
        }
        return this.portfolioItemTypePaths.length - 1;
    },
    getState: function(){
        var state = {};
        if (this.initiativeHash){
            state.initiatives = Ext.Object.getKeys(this.initiativeHash);
        }
        this.logger.log('getState', state);
        return state;
    },
    applyState: function(state){
        this.logger.log('applyState', state);
        if (state.hasOwnProperty('initiatives')){
            this.initiativeHash = {};
            Ext.Array.each(state.initiatives, function(i){
                this.initiativeHash[i] = {};
            }, this);
        }
    },

    getSelectedPortfolioItems: function(){
        var ids = Ext.Object.getKeys(this.getInitiativeHash()),
            portfolioItemPath = this.portfolioItemTypePaths[this.getTargetPortfolioLevel()].toLowerCase();
        return Ext.Array.map(ids, function(id){ return Ext.String.format('/{0}/{1}', portfolioItemPath, id); });
    },
    selectPortfolioItems: function(){
        var thisHeight = Math.min(this.getHeight(), 300),
            selectedRecords = this.getSelectedPortfolioItems();


        this.logger.log('selectPortfolioItems',thisHeight, this.height);
        Ext.create('Rally.ui.dialog.ArtifactChooserDialog', {
            artifactTypes: [this.portfolioItemTypePaths[this.getTargetPortfolioLevel()]],
            autoShow: true,
            height: thisHeight,
            multiple: true,
            title: 'Choose Portfolio Item(s)',
            selectedRecords: selectedRecords,
            storeConfig: {
                filters: [{
                    property: 'Children.ObjectID',
                    operator: '>',
                    value: 0
                }]
            },
            listeners: {
                artifactchosen: this.updateSelectedPortfolioItems,
                scope: this
            }
        });
    },
    updateSelectedPortfolioItems: function(ct, portfolioItems){
        this.logger.log('updateSelectedPortfolioItems', portfolioItems);

        if (ct.itemId === 'clearPI'){
            portfolioItems = [];
        }

        if (portfolioItems && portfolioItems.length > 0){
            this.down('#selectPI').removeCls('secondary');
            this.down('#selectPI').addCls('primary');
            this.down('#clearPI').setVisible(true);
        } else {
            this.down('#selectPI').removeCls('primary');
            this.down('#selectPI').addCls('secondary');
            this.down('#clearPI').setVisible(false);
        }

        this.initiativeHash = {};
        Ext.Array.each(portfolioItems || [], function(p){
            this.initiativeHash[p.get('ObjectID')] = {info:  p.getData()};
        }, this);


        this.saveState();
        this.updateView();
    },
    getInitiativeHash: function(){
        if (!this.initiativeHash){
            this.initiativeHash = {};
        }
        return this.initiativeHash;
    },
    updateView: function(){
        var commitDate = this.getCommitDate(),
            deliverDate = this.getDeliveredDate(),
            timeboxScope = this.getContext().getTimeboxScope();

        this.logger.log('updateView', commitDate, deliverDate, timeboxScope);

        this.getDisplayBox().removeAll();
        this.initiativeHash = {};

        if (!commitDate || !deliverDate){
            this.showAppMessage(this.DATE_MISSING_MSG);
            return;
        }

        this.setLoading(true);
        this.fetchReleases(timeboxScope);

    },
    fetchReleases: function(timeboxScope){
        this.logger.log('fetchReleases', timeboxScope);

        var filters = null;
        if (timeboxScope.getRecord()){
            filters = [{
               property: 'Name',
               value: timeboxScope.getRecord().get('Name')
            },{
                property: 'ReleaseStartDate',
                value: timeboxScope.getRecord().get('ReleaseStartDate')
            },{
                property: 'ReleaseDate',
                value: timeboxScope.getRecord().get('ReleaseDate')
            }]
        }

        if (!filters){
            this.showAppMessage("No release selected.");
            return;
        }

        Ext.create('Rally.data.wsapi.Store',{
            model: 'Release',
            fetch: ['ObjectID','Name'],
            filters: filters,
            limit: 'Infinity'
        }).load({
            callback: this.fetchFeatures,
            scope: this
        });

    },
    fetchFeatures: function(releases, operation){
        this.logger.log('fetchFeatures', releases, operation);

        if (!operation.wasSuccessful()){
            this.showErrorNotification("Error fetching Releases: " + operation && operation.error && operation.error.errors.join(','));
            return;
        }

        var releaseIds = Ext.Array.map(releases, function(r){
            return r.get('ObjectID');
        });

        var promises = [];
        if (this.getCommitDate()){
            promises.push(this.fetchFeatureSnapshots(releaseIds, this.getCommitDate()));
        }
        if (this.getDeliveredDate()){
            promises.push(this.fetchFeatureSnapshots(releaseIds, this.getDeliveredDate()));
        }

        Deft.Promise.all(promises).then({
            success: this.buildChart,
            failure: this.showErrorNotification,
            scope: this
        }).always(function(){ this.setLoading(false);},this);

    },
    fetchFeatureSnapshots: function(releaseIds, asOfDate){
        var deferred = Ext.create('Deft.Deferred');

        var fetch = ['ObjectID','Parent','State','_ItemHierarchy'];
        if (this.getSetting('featureBlockedField')){
            fetch.push(this.getSetting('featureBlockedField'));
        }

        var find = {
            _TypeHierarchy: this.portfolioItemTypePaths[0],
            Release: {$in: releaseIds},
            __At: asOfDate,
            _ProjectHierarchy: this.getContext().getProject().ObjectID
        };


        var portfolioItems = Ext.Array.map(Ext.Object.getKeys(this.getInitiativeHash()), function(k){ return Number(k); });
        if (portfolioItems && portfolioItems.length > 0){
             //find.Parent = {$in: portfolioItems}
            find._ItemHierarchy = {$in: portfolioItems}
        }
        this.logger.log('fetchFeatureSnapshots selected portfolio items', this.getInitiativeHash(), portfolioItems, find);

        Ext.create('Rally.data.lookback.SnapshotStore',{
            fetch: fetch,
            find: find,
            hydrate: ['State']
        }).load({
            callback: function(records, operation, success){
                if (success){
                    deferred.resolve(records);
                } else {
                    deferred.reject("Error fetching Portfolio Item snapshots:  " + operation && operation.error && operation.error.errors.join(','));
                }
            }
        });

        return deferred;
    },
    fetchInitiativeInfo: function(initiatives){
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log('fetchInitiativeInfo', initiatives);
        var filters = [];
        if (initiatives.length < this.MAX_INITIATIVES){
            filters = Ext.Array.map(initiatives, function(i){ return {property: 'ObjectID', value: i }; });
            filters = Rally.data.wsapi.Filter.or(filters);
        }
        this.setLoading(true);
        Ext.create('Rally.data.wsapi.Store',{
            model: this.portfolioItemTypePaths[this.getTargetPortfolioLevel()],
            fetch: ['FormattedID','Name','ObjectID'],
            filters: filters,
            limit: 'Infinity',
            context: {project: null}
        }).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    var initiativeHash = this.getInitiativeHash();
                    Ext.Array.each(records, function(r){
                        if (!initiativeHash[r.get('ObjectID')]){
                            initiativeHash[r.get('ObjectID')] = {};
                        }
                        initiativeHash[r.get('ObjectID')].info = r.getData();
                    });
                    deferred.resolve(initiativeHash);
                } else {
                    deferred.reject("Error loading initiative information:  " + operation.error.errors.join(','));
                }
            },
            scope: this
        }).always(function(){ this.setLoading(false);},this);
        return deferred;
    },
    buildChart: function(featureSnapshots){
        this.logger.log('buildChart', featureSnapshots);

        var committedFeatures = [],
            deliveredFeatures = [],
            idx =0;

        if (this.getCommitDate()){
            committedFeatures = featureSnapshots[idx++] || [];
        }
        if (this.getDeliveredDate()){
            deliveredFeatures = featureSnapshots[idx++] || [];
        }

        this.populateInitiativeHash(this.getInitiativeHash(), committedFeatures, 'committed');
        this.populateInitiativeHash(this.getInitiativeHash(), deliveredFeatures, 'delivered');

        var loadInitiatives = [];
        Ext.Object.each(this.getInitiativeHash(), function(oid,obj){
            if (!isNaN(oid) && (!obj || !obj.info)){
                loadInitiatives.push(oid);
            }
        });
        this.logger.log('buildChart', loadInitiatives, this.getInitiativeHash());
        if (loadInitiatives.length > 0){
            this.fetchInitiativeInfo(loadInitiatives).then({
                success: this.addChart,
                failure: this.showErrorNotification,
                scope: this
            });
        } else {
            this.addChart(this.getInitiativeHash());
        }
    },
    addChart: function(initiativeHash){
        this.logger.log('addChart', initiativeHash);
        this.getDisplayBox().add({
            xtype: 'rallychart',
            chartColors: ['#FAD200','#005EB8','#8DC63F','#EE1C25','#3a874f','#B81B10'],
            chartConfig: this.getChartConfig(initiativeHash),
            chartData: this.getChartData(initiativeHash)
        });
    },
    getChartConfig: function(initiativeHash){
        var width = this.getWidth(),
            categoryCount = Ext.Object.getKeys(initiativeHash).length,
            ratio = width/categoryCount,
            rotation = 0,
            marginLeft = null;



        if (ratio < 50){
            rotation = -90;
        } else if (ratio < 75){
            rotation = -45;
            marginLeft = 100;
        } else if (ratio < 100){
            rotation = -20;
            marginLeft = 150;
        }
        this.logger.log('getChartConfig', ratio, width, categoryCount);

        return {
            chart: {
                type: 'column',
                marginLeft: marginLeft
            },
            title: {
                text: 'Features Committed vs. Delivered'
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Count'
                }
            },
            xAxis: {
                labels: {
                    rotation: rotation
                  //  autoRotation: [-10, -20, -30, -40, -50, -60, -70, -80, -90]
                }
            },
            tooltip: {
                headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
                pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y:.1f}</b></td></tr>',
                footerFormat: '</table>',
                shared: true,
                useHTML: true
            },
            plotOptions: {
                column: {
                    pointPadding: 0.2,
                    borderWidth: 0,
                    stacking: 'normal'
                }
            }
        };
    },
    getFeatureDoneState: function(){
        this.logger.log('getFeatureDoneState', this.getSetting('featureDoneState'));
        return this.getSetting('featureDoneState');
    },
    getFeatureBlockedField: function(){
        return this.getSetting('featureBlockedField') || null;
    },
    getXLabel: function(obj){
        this.logger.log('getXLabel', obj);
        return Ext.String.format("{0}: {1}", obj.FormattedID, obj.Name);
    },
    getChartData: function(initiativeHash){

        var categories = [],
            committed = [],
            delivered = [],
            added = [],
            blocked = [],
            blockedAdded = [],
            notCompleted = [],
            removedFeatures = [],
            featureDoneState = this.getFeatureDoneState(),
            featureBlockedField = this.getFeatureBlockedField();

        Ext.Object.each(initiativeHash, function(i,types){
            var id = i;
            if (types.info){
                categories.push(this.getXLabel(types.info));
                id = types.info.FormattedID;
            } else {
                categories.push(i);
            }
            var committedOids = _.pluck(types.committed || [], 'ObjectID'),
                deliveredOids = _.pluck(types.delivered || [], 'ObjectID');

            var removed = Ext.Array.difference(committedOids, deliveredOids);

            this.logger.log('---- START Initiative id=', id, ', committed=', committedOids)
            committed.push(types.committed && types.committed.length || 0);
            var done = 0,
                notDone = 0,
                blockedCount = 0,
                addedCount = 0,
                blockedAddedCount = 0;

            Ext.Array.each(types.delivered, function(d){
                if (!Ext.Array.contains(committedOids, d.ObjectID)){
                    addedCount++;
                }

                if (featureBlockedField && d[featureBlockedField] === true){
                    if (!Ext.Array.contains(committedOids, d.ObjectID)) {
                        this.logger.log('blocked and added not committed', d.ObjectID)
                        blockedAddedCount++;
                    } else {
                        blockedCount++;
                    }
                } else if (d.State === featureDoneState){
                    done++;
                } else {
                    notDone++;
                }
            }, this);
            this.logger.log('---- END Initiative id=', id)

            delivered.push(done);
            blocked.push(blockedCount);
            blockedAdded.push(blockedAddedCount);
            notCompleted.push(notDone);
            removedFeatures.push(removed.length);
            added.push(addedCount);
        }, this);

        return {
            categories: categories,
            series: [{
                name: 'Committed',
                data: committed,
                stack: 'Committed'
            },{
                name: this.getFeatureDoneState(),
                data: delivered,
                stack: 'Delivered'
            },{
                name: 'Added',
                data: added
            },{
                name: 'Not ' + this.getFeatureDoneState(),
                data: notCompleted,
                stack: 'notComplete'
            },{
                name: 'Removed',
                data: removedFeatures,
                stack: 'removed'

                //},{
            //    name: 'Added (Blocked)',
            //    data: blockedAdded
            //},{
            //    name: 'Not Completed (Blocked)',
            //    data: blocked,
            //    stack: 'notComplete'
            }]
        };
    },
    populateInitiativeHash: function(hash, snapshots, category){
        this.logger.log('populateInitiativeHash', hash, snapshots, category);
        var piOffset = this.getTargetPortfolioLevel();

        for (var i=0; i<snapshots.length; i++){
            var snap = snapshots[i].getData(),
                itemHierarchy = snap._ItemHierarchy,
                initiative = 'none';
                //initiative = snap.Parent || 'none';

            if (piOffset < itemHierarchy.length){
                var initiativeIdx = itemHierarchy.length - 1 - piOffset;
                initiative = itemHierarchy[initiativeIdx];
            }
            //itemHierarchy Array [ 45976979662, 45976979372, 44772028590, 57379683523 ] 57379683523
            if (initiative){
                if (!hash[initiative]){
                    hash[initiative] = {};
                }
                if (!hash[initiative][category]){
                    hash[initiative][category] = [];
                }
                hash[initiative][category].push(snap);
            }
        }
        this.logger.log('populateInitiativeHash end', hash);

    },
    getSettingsFields: function(){

        var labelWidth = 150,
            me = this;

        return [];
        //return [{
        //    xtype: 'rallyfieldvaluecombobox',
        //    model: this.portfolioItemTypePaths[0],
        //    name: 'featureDoneState',
        //    field: 'State',
        //    fieldLabel: 'Portfolio Complete State',
        //    labelAlign: 'right',
        //    labelWidth: labelWidth,
        //    valueField: 'Name'
        //   // value: this.getSetting('featureDoneState')
        //},{
        //    xtype: 'rallyfieldcombobox',
        //    model: this.portfolioItemTypePaths[0],
        //    name: 'featureBlockedField',
        //    fieldLabel: 'Portfolio Blocked Field',
        //    labelAlign: 'right',
        //    labelWidth: labelWidth,
        //    _isNotHidden: function(field) {
        //        return !field.hidden && field.attributeDefinition && field.attributeDefinition.AttributeType.toUpperCase() === "BOOLEAN";
        //    }
        //}];
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }
});
