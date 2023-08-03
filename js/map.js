var map = L.map('map').setView([41.505493, -81.681290], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Geogrpahic data files
// Currently only includes data from 2010, some of these boundaries have changed since then
// Need to get new geographic data and create a way to pick between them
const files = ["council_d2010", "counties2010", "cuyregion2010", "dcfs2010", "mcd2010", "neighbor2010", "tract2010", "ward2010", "zipcode2010"]
const geoIds = [2, 1, 3, 4, 5, 6, 7, 8, 9]
const geoNames = ["COUNCIL_D", "CNTYNME10", "CUYREGION", "DCFS", "MCDNME10", "NEIGHBOR10", "TRACT10", "CLEWARD", "ZIP10"]
// Path to the geojson files from the webpage
// Should be changed to a full url, e.g. "https://neocando.case.edu/data/"
const file_path = "data/"

var ncMap = {
    // Holds all of the layers the user adds
    layerControl : L.control.layers().addTo(map),

    // The geographic bounds are set when the variable is selected in case the user
    // reselects a geographic bounds and the variable they selected is no longer available
    // with those settings
    setGeoLevel : function(level) { ncMap.geoLevel = level; },
    getGeoLevel : function() { return ncMap.geoLevel; },

    // Grabs the geojson data when the map is created
    // Once the file is recieved it parses the json data and calls mapData
    async getGEOData(index, data) {
        var response = await fetch('./'.concat(file_path).concat(files[index]).concat('.json'));
        const gJSON = await response.json();
        // Use the first variable description as the name
        ncMap.mapData(gJSON, data.names[2], data, index)
    },

    // mapData
    // Parameters
    // 1. json: The geojson data to be mapped
    // 2. name: This will be the name displayed in the layer control (set by the caller to the name of the variable)
    // 3. data: The data returned by neocando
    // 4. index: the index of the geographic bounds set, this is used to get data from files, geoIds, and geoNames
    mapData(json, name, data, index) {
        // Calculate the color levels before mapping the data
        // (so that the data analysis is only done once)
        ncMap.setColorLevels(data)
        ncMap.layerControl.addOverlay(L.geoJSON(json, {style: (feature) => {return ncMap.getStyle(feature, data, index)}, filter: (feature, layer) => {return ncMap.filter(feature, layer, data, index)}, onEachFeature: (feature, layer) => {return ncMap.onEachFeature(feature, layer, data, index, name)}}),name);
    },

    // Gets the index of a given geographic feature in the arrays stored in data
    // feature: geojson feature
    // data: data array returned by neocando
    // index: index of the geographic bounds
    getDataIndex : function(feature, data, index) {
        if(!isNaN(parseInt(data.data[1][0]))) {
            fID = parseInt(feature.properties[geoNames[index]])
            dataIndex = data.data[1].map(x => parseInt(x)).indexOf(fID)
        } else {
            fID = feature.properties[geoNames[index]].trim()
            dataIndex = data.data[1].map(x => x.trim()).indexOf(fID)
        }
        return dataIndex;
    },
    
    // This sets the color levels prior to mapping
    // It takes the data and sets the field color_properties with the color grades
    setColorLevels(data) {
        data_arr = []
        for(var i = 0; i < data.data[2].length; i++) {
            if(data.data[2][i]) {
                var data_val = parseFloat(data.data[2][i])
                if(!isNaN(data_val)) {
                    data_arr.push(data_val)
                }
            }
        }
        // Get the minimum and maximum values
        var min = Math.min(...data_arr)
        var max = Math.max(...data_arr)
        var levels = []
        // Set the color grades as linear interpolations between the minimum and maximum values
        if(max > min) {
            for(var i = 0; i < 8; i++){
                levels.push(min + ((max - min) * (i / 8)))
            }
        } else {
            console.log("data_error");
            console.log(data_arr);
        }
        console.log("min: " + min + " max: " + max);
        ncMap.color_properties = {min: min, max: max, levels:levels};
    },

    // This is ran on each feature to add the popups
    // Anything else which needs to be changed for each mapped feature should be added here
    onEachFeature : function(feature, layer, data, index, name) {
        dataIndex = ncMap.getDataIndex(feature, data, index);
        if(dataIndex > -1) {
            layer.bindPopup("<b>" + data.data[2][dataIndex] + "</b><br>" + feature.properties[geoNames[index]] + "<br>" + name)
        }
    },

    // Only show features which are contained in the data set
    filter : function(feature, layer, data, index) {
        dataIndex = ncMap.getDataIndex(feature, data, index);
        if(dataIndex > -1) {
            return true;
        }
        return false;
    },

    // Returns the styling parameters for each feature
    getStyle(feature, data, index) {
        dataIndex = ncMap.getDataIndex(feature, data, index);
        if(dataIndex > -1) {
        return {
            fillColor: ncMap.getColor(data.data[2][dataIndex]),
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.5
        };
        }
    },

    // Returns the correct color for each color grade
    getColor(d) {
        return d > ncMap.color_properties.levels[7] ? '#800026' :
            d > ncMap.color_properties.levels[6]  ? '#BD0026' :
            d > ncMap.color_properties.levels[5]  ? '#E31A1C' :
            d > ncMap.color_properties.levels[4]  ? '#FC4E2A' :
            d > ncMap.color_properties.levels[3]   ? '#FD8D3C' :
            d > ncMap.color_properties.levels[2]   ? '#FEB24C' :
            d > ncMap.color_properties.levels[1]   ? '#FED976' :
                            '#FFEDA0';    
    },
/*
LEGEND CODE
TODO: Make dynamic legend
    legend : L.control({position: 'bottomright'});

    legend.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'info legend'),
            grades = [0, 10, 1000, 5000, 10000, 20000, 50000],
            labels = [];

        for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
        }

        return div;
    };

legend.addTo(map);
*/
    // Places a variable available to be selected (geographic boundaries, counties, and variables)
    addVar : function(container, obj) {
        // objformat= {val: "value", name: "name", group: "group", type: "type"}
        // There's more similarity between the code now, the code size could be reduced here
        if(obj.group == "county") {
            var county = $('<a class="list-group-item list-group-item-action" href="#">' + obj.name + '</a>');
            county.data('group', obj.group);
            county.data('val', obj.val);
            county.data('code', obj.code);
            county.on('click', ncMap.countyChange);
            county.addClass('active');
            container.append(county);
        } else if(obj.group == "geography") {
            var geo = $('<a class="list-group-item list-group-item-action" href="#">' + obj.name + '</a>');
            if(obj.name=="Cleveland Ward" || obj.name=="Census Tract") {
                geo.append('<div class="badge bg-secondary mx-2">2010</div>');
            }
            geo.data('group', obj.group);
            geo.data('val', obj.val);
            geo.data('name', obj.name)
            geo.on('click', ncMap.geographyChange);
            container.append(geo);
        } else if(obj.group == "variable") {
            var variable = $('<a role="button" class="list-group-item list-group-item-action" href="#">' + obj.name + '</a>');
            variable.data('group', obj.group);
            variable.data('val', obj.val);
            variable.on('click', ncMap.variableChange);
            container.append(variable);
        }
    },

    // This gets the geographic boundaries and counties available for selection
    // It is called as soon as the webpage loads this script
    requestSelections : function() {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if(this.status==200 && this.readyState==4) {
                var xmlDoc = $.parseXML(this.responseText)
                var $xml = $(xmlDoc)
                var counties = $xml.find('#county > data > row');
                $("#county_container").empty();
                $("#county_drop")[0].textContent = "Filter Counties";
                $("#county_load").hide();
                for (var i = 0; i < counties.length; i++) {
                    var county = $(counties[i]);
                    ncMap.addVar($("#county_container"), {name:county.children('column[id=county_text]')[0].textContent, val:county.children('column[id=id]')[0].textContent, group:"county", type:"checkbox", code:county.children('column[id=code]')[0].textContent})
                }
                var geographies = $xml.find('#geographic_level > data > row');
                $("#geography_container").empty();
                $("#geo_drop")[0].textContent = "Geographic Level";
                $("#geo_load").hide();
                for (var i = 0; i < geographies.length; i++) {
                    var geo = $(geographies[i])
                    ncMap.addVar($("#geography_container"), {name:geo.children('column[id=geographic_level_text]')[0].textContent, val:geo.children('column[id=id]')[0].textContent, group:"geography", type:"radio"})
                }
            }
        };
        xhttp.open("POST", "https://neocando.case.edu/neocando/DataService", true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        body = ncMap.requestBody("load-social-geographies", null);
        xhttp.send(body);
    },

    // This gets the available variables once a geographic boundary is set
    requestVariables : function(params) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if(this.status==200 && this.readyState==4) {
                $("#variable_container").empty();
                var xmlDoc = $.parseXML(this.responseText)
                var $xml = $(xmlDoc)
                var variables = $xml.find('#var > data > row');
                for (var i = 0; i < variables.length; i++) {
                    var variable = $(variables[i]);
                    ncMap.addVar($("#variable_container"), {name:variable.children('column[id=var_desc]')[0].textContent, val:variable.children('column[id=id]')[0].textContent, group:"variable", type:"radio"})
                }
                $("#var_loader").hide();
                // In the future we could get the categories to sort the variables easier
                /*var categories = $xml.find('response').find('column[id=geographic_level_text]');
                for (var i = 0; i < geographies.length; i++) {
                    addVar("#geography_container", {name:geographies[i].textContent, val:geographies[i].textContent, group:"geography", type:"radio"}, "geographyChange()")
                }
                */
            }
        };
        xhttp.open("POST", "https://neocando.case.edu/neocando/DataService", true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        body = ncMap.requestBody("load-only-variable-level", params);
        xhttp.send(body);
    },

    // Get the counties in the current selection (all by default)
    getCounties : function() {
        county_arr = [];
        counties = $("#county_container").children('a.active').each(function() {
            county = {name: $(this).text(), id: $(this).data('val'), code: $(this).data('code')};
            county_arr.push(county);
        });
        return county_arr;
    },

    // The the selected variable(s)
    getVariables : function() {
        variables = $('#variable_container > a.active');
        variable_arr = [];
        // Currently doesn't work with multiple variables, 
        // as the data function only returns data for the first element
        for (var i = 0; i < variables.length; i++) {
            variable = {name: variables[i].textContent, id: variables.data().val};
            variable_arr.push(variable);
        }
        return variable_arr;
    },

    // When a variable is selected this event is called
    variableChange : function(e) {
        e.preventDefault();
        var target = $(e.target);
        $("#var_name")[0].textContent = ["\"",target[0].textContent, "\""].join('');
        $("#var_name").show();
        target.addClass("active").siblings().removeClass("active");
        return false;
    },

    // When the create map button is pressed, this gets the current parameters and executes the query
    executeQuery : function() {
        var counties = ncMap.getCounties();
        var vars = ncMap.getVariables();
        if(counties.length > 0 && vars.length > 0) {
            var geo = $("#geography_container").children('a.active');
            var geoParams = {id: geo.data().val, gname: geo.data().name}
            var params = ncMap.buildParams({geographic_level: geoParams, counties: counties, vars: vars})
            ncMap.setGeoLevel(geoParams)
            ncMap.sendQuery(params);
        }
    },

    sendQuery : function(params) {
        const action = "execute-social-economic-query"
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if(this.status==200 && this.readyState==4) {
                ncMap.parseData(this.responseText);
            }
        };
        xhttp.open("POST", "https://neocando.case.edu/neocando/DataService", true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        body = ncMap.requestBody(action, params);
        xhttp.send(body);
    },

    // When a geographic boundary is set, this is called
    geographyChange : function(e) {
        var target = $(e.target);
        // Deselect any other selections
        target.addClass("active").siblings().removeClass("active");
        var varc = $("#variable_container").empty()
        varc.append('<li><div class="spinner-border"></li>');
        $("#var_loader").show();

        // Automatically get new variables when this changes
        var counties = ncMap.getCounties();
        if(counties.length > 0) {
            var params = ncMap.buildParams({geographic_level: {id: target.data().val, gname: target.data().name}, counties: counties})
            ncMap.requestVariables(params);
        }
        //$("#geo_drop").dropdown('toggle');
        return false;
    },

    // When a county is clicked, this executes
    countyChange : function(e) {
        // Toggle active/disabled
        var target = $(e.target);
        if(target.hasClass("active")) {
            target.removeClass("active");
        } else {
            target.addClass("active");
        }
        return false;
    },

    // Formats the xml for a request
    requestBody : function(action, parameters) {
        // should be rewritten to use array.join for better performance
        if(parameters != null) {
            return 'xml=<?xml+version="1.0"?><request><action>' + action + '</action>' + parameters + '</request>';
        } else {
            return 'xml=<?xml+version="1.0"?><request><action>' + action + '</action></request>';
        }
    },

    // Formats the parameters for a request to the server
    buildParams : function(parameters) {
        var root = $('<root>');
        var params = $('<parameters>'); 
        for (var param in parameters) {
            if(param == "counties") {
                id = parameters[param][0].id;
                cname = parameters[param][0].name;
                for (var i = 1; i < parameters[param].length; i++) {
                    id += "," + parameters[param][i].id;
                    cname += "; " + parameters[param][i].name;
                }
                var $county = $('<county_select id="' + id + '">');
                $county.append('<![CDATA[' + cname + ']]>');
                params.append($county);
            } else if(param == "geographic_level") {
                id=parameters[param].id;
                gname=parameters[param].gname;
                var $geography = $('<geographic_level_select id="' + id + '">');
                $geography.append('<![CDATA[' + gname + ']]>');
                params.append($geography);
            } else if(param == "vars") {
                id = parameters[param][0].id;
                vname = parameters[param][0].name;
                for (var i = 1; i < parameters[param].length; i++) {
                    id += "," + parameters[param][i].id;
                    vname += "; " + parameters[param][i].name;
                }
                var $variable = $('<selected_variables_list id="' + id + '">');
                $variable.append('<![CDATA[' + vname + ']]>');
                params.append($variable);
            }
        }
        root.append(params);
        return root.html();
    },

    // Parse the data returned by the server
    parseData : function(data) {
        var xmlDoc = $.parseXML(data);
        var $xml = $(xmlDoc);
        variableList = ncMap.getDataVars($xml);
        variableList["data"] = [];
        for(var i = 0; i < variableList.vars.length; i++) {
            variableList.data.push([])
            $xml.find('#socialEconomicQuery > data > row > column[id="'+variableList.vars[i]+'"]').each(function() {
                variableList.data[i].push($(this)[0].textContent);
            });
        }
        ncMap.makeMapLayer(variableList);
    },

    makeMapLayer : function(varList) {
        gL = ncMap.getGeoLevel();
        geoIndex = geoIds.indexOf(parseInt(gL.id));
        if(geoIndex > -1) {
            ncMap.getGEOData(geoIndex, varList);
        } else {
            console.log("Error: geoId not found");
        }
    },

    getDataVars : function(doc) {
        var varArray = [];
        var nameArray = [];
        doc.find('#socialEconomicQuery > attributes > attribute').each(function() {
            varArray.push($(this).children('id')[0].textContent);
            nameArray.push($(this).children('label')[0].textContent);
        });
        return {vars: varArray, names: nameArray};
    },

    // Used by the search bar to filter the available variables
    filterVariables : function() {
        var input = document.getElementById('var_search');
        var filter = input.value.toUpperCase();
        $("#variable_container > a").each(function() {
            var txtValue = $(this).text();
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                $(this).show();
            } else {
                $(this).hide();
            }    
        });
    }

};

// Hide the elements which shouldn't be shown initially
$("#var_loader").hide();
$("#var_name").hide();

// Request the variables available for selection immediately
ncMap.requestSelections();