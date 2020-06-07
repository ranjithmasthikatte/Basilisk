import { Component, OnInit } from '@angular/core';
import axios from 'axios';
import { version } from 'punycode';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import * as d3 from 'd3'


@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {

  constructor() { }

  allDatasets="http://131.234.28.165:3030/$/datasets";
  connectionString="http://131.234.28.165:3030";
  postConnectionString="/sparql?query=";

  listOfAllDatasets=[]; //contains names of available datasets
  listOfAllVersions=[]; //contains all versions w.r.t noOfWorkers
  listOfUniqueVersions=[]; //contains all versions of triple stores available
  selectedVersions=[]; //containes versions selected by user
  selectedOptions=["x-axis", "y-axis", "graph"];
  listOfWorkers=["$1worker", "$4workers", "$8workers", "$16workers", "$32workers"]
  noOfClients=["1 client", "4 clients", "8 clients", "16 clients", "32 clients", "All"]
  queryId=[];  //contains all queryIds
  dataDictionary = {}; //contains all data
  result_size=[1, 2, 3]
  metrices=["QPS", "Avg QPS", "Avg query time", "No. of Failed queries", "QMpH",
            "QPS per query", "Avg QPS per query", "Avg query-time per query", "No. of Failed queries", "Failed Reason"];


  queryForAllGraphs = "SELECT ?g { GRAPH ?g {} }";

  querySelectPart = "SELECT ?query ?property ?value \n"
  queryWherePart = "WHERE {" +
    "VALUES ?property { <http://iguana-benchmark.eu/properties/connection>" +
    "<http://iguana-benchmark.eu/properties/noOfWorkers>" +
    "<http://iguana-benchmark.eu/properties/queriesPerSecond>" +
    "<http://iguana-benchmark.eu/properties/queryMixes>" +
    "<http://iguana-benchmark.eu/properties/totalTime>" +
    "<http://iguana-benchmark.eu/properties/failed>" +
    "<http://iguana-benchmark.eu/properties/wrongCodes>" +
    "<http://iguana-benchmark.eu/properties/resultSize>}" +

    "?query ?property ?value ." +
  "}"

  /**
   * This function calls imediately when the component is created
   * Gets list of datasets available on fuseki server
   */
  ngOnInit(): void {
    axios({
      method: 'get',
      url: this.allDatasets})
    .then(res => this.getDatasets(res))
    .catch(err => console.log(err));

    for(var i = 0; i <= 12; i++){ //populate queryId
      this.queryId.push("sparql" + i);
    }
  }

  /**
   * Get the datasets from the response object and store them into a seperate array
   *
   * @param {Object} response - json object containing details of the available datasets
   */
  getDatasets(response){
    for(var i=0; i<response.data.datasets.length; i++){
      var datasetName = response.data.datasets[i]["ds.name"];
      this.listOfAllDatasets.push(datasetName);
      this.runVersionQuery(datasetName, i);
    }
  }

  /**
   * Run query to get the all versions of the dataset passed
   *
   * @param {String} dataset - Name of the dataset
   */
  runVersionQuery(dataset, datasetNo){
    var getVersionsQuery = this.connectionString + dataset + this.postConnectionString + encodeURIComponent(this.queryForAllGraphs);
    axios({
      method: 'get',
      url: getVersionsQuery})
    .then(res => this.getVersions(res, dataset, datasetNo))
    .catch(err => console.log(err));
  }

  /**
   * This function is called once for each dataset
   * Goes through each element of the object and extract version names
   *
   * @param response - json object containing response of to the version query
   */
  getVersions(response, dataset, datasetNo){
    response.data.results.bindings.forEach(element => {
      this.listOfAllVersions.push([element.g.value, dataset]);
      if(response.data.results.bindings.indexOf(element)%5 == 1){
        var name = element.g.value;
        this.listOfUniqueVersions.push(name.slice(0, name.indexOf('$')));
      }
    });
    if(datasetNo == 2){
      this.getAllData();
    }
  }

  /**
   * Runs queries to get data for all version of triple stores
   */
  getAllData(){
    this.listOfAllVersions.forEach(element => {
      var queryFromPart = "FROM <" + element[0] + "> \n";
      var queryAllParts = this.querySelectPart + queryFromPart + this.queryWherePart;
      let queryForAllData = this.connectionString + element[1] + this.postConnectionString + encodeURIComponent(queryAllParts);

      axios({
        method: 'get',
        url: queryForAllData})
      .then(res => this.sortData(res.data.results.bindings, element[0]))
      .catch(err => console.log(err));
    })
  }

  /**
   *sorts data with respect to the version and store them in the form of dictionary
   *
   * @param {Array} data - data in the form of array for each triple store
   * @param {String} element - contains name of version and no. of workers
   */
  sortData(data, element){

    var qm = []
    var arr4d = [];
    var arr3d = [];
    this.queryId.forEach(id => {
      var arr2d = [id, [], [], [], [], []]
      arr3d.push(arr2d);
    })

    data.forEach(item => {
      if(item.property.value.slice(item.property.value.lastIndexOf("/")+1) == "queriesPerSecond") {
        var index = parseInt(item.query.value.slice(item.query.value.lastIndexOf("l")+1));
        arr3d[index][1].push(item.value.value)
      }
      else if(item.property.value.slice(item.property.value.lastIndexOf("/")+1) == "totalTime") {
        var index = parseInt(item.query.value.slice(item.query.value.lastIndexOf("l")+1));
        arr3d[index][2].push(item.value.value)
      }
      else if(item.property.value.slice(item.property.value.lastIndexOf("/")+1) == "failed") {
        var index = parseInt(item.query.value.slice(item.query.value.lastIndexOf("l")+1));
        arr3d[index][3].push(item.value.value)
      }
      else if(item.property.value.slice(item.property.value.lastIndexOf("/")+1) == "wrongCodes") {
        var index = parseInt(item.query.value.slice(item.query.value.lastIndexOf("l")+1));
        arr3d[index][4].push(item.value.value)
      }
      else if(item.property.value.slice(item.property.value.lastIndexOf("/")+1) == "resultSize") {
        var index = parseInt(item.query.value.slice(item.query.value.lastIndexOf("l")+1));
        arr3d[index][5].push(item.value.value)
      }
      else if(item.property.value.slice(item.property.value.lastIndexOf("/")+1) == "queryMixes") {
        qm.push(item.value.value)
      }
      else if(item.property.value.slice(item.property.value.lastIndexOf("/")+1) == "noOfWorkers") {
        arr4d.push(item.value.value)
      }
    });

    arr4d.push(qm);
    arr4d.push(arr3d);
    this.dataDictionary[element] = arr4d;
  }


  /**
   * Creates an array of selected versions
   *
   * @param {String} version - Version selected by user
   */
  versionSelected(version){
    this.selectedVersions.push(version);
  }


  /**
   * Deletes the respective version from the list when clicked on cross icon
   *
   * @param {String} version - version to be deleted
   */
  versionDeleted(version)
  {
    const index=this.selectedVersions.indexOf(version);
    if(index>-1)
    {
     this.selectedVersions.splice(index,1);
    }
  }

  /**
   * Changes the position of the selected versions in the array when an item is dragged
   *
   * @param {Event} event - event containing index of draged items
   */
  dragDrop(event: CdkDragDrop<string[]>){
    moveItemInArray(this.selectedVersions, event.previousIndex, event.currentIndex);
  }

  /**
   * Calls when user selects x-axis value
   *
   * @param {String} xValue - selected value
   */
  xAxisSelected(xValue){
    this.selectedOptions[0] = xValue;
  }

  /**
   * Calls when user selects y-axis value
   *
   * @param {String} yValue - selected value
   */
  yAxisSelected(yValue){
    this.selectedOptions[1] = yValue;
  }

  /**
   * calls when user selects graph to display
   *
   * @param {String} graph - selected value
   */
  graphSelected(graph){
    this.selectedOptions[2] = graph;
  }

  /**
   * When user clicks on 'Submit' button
   */
  onSubmit(){
    /* var newArray = [];
    for (const [key, value] of Object.entries(this.dataDictionary)) {
      console.log(key, value);
    } */

    //get data related to values selected on x-axis
    this.selectedVersions.forEach(version => {
      if(this.selectedOptions[0].slice(2, 8) == "client" || this.selectedOptions[0].slice(3, 9) == "client"){
        var key = version + this.listOfWorkers[this.noOfClients.indexOf(this.selectedOptions[0])];
        console.log(key)
      }
      else if(this.selectedOptions[0] == "All"){
        var keys = [];
        this.listOfWorkers.forEach(worker => {
          keys.push(version+worker);
        });
        console.log(keys)
      }
      else if(this.selectedOptions[0].slice(0, 6) == "sparql"){
        var selectedQueryID = parseInt(this.selectedOptions[0].slice(6));
        console.log(selectedQueryID);
        var keys = [];
        this.listOfWorkers.forEach(worker => {
          keys.push(version+worker);
        });
      }

      //get data related to values selected on y-axis
      if(this.metrices.indexOf(this.selectedOptions[1]) <= 4){
        var aggregated: Boolean = true;
      }
      else{
        var aggregated: Boolean = false;
      }
      if(key){
        var data = this.dataDictionary[key];
        var concatenated = [];
        console.log(data);
        var indexAndAvg = this.getIndex(this.metrices.indexOf(this.selectedOptions[1]));
        if(aggregated == true){
          if(indexAndAvg[2] == true){
            concatenated = data[1];
          }
          else{
            data[2].forEach(queryid => {
              concatenated = concatenated.concat(queryid[indexAndAvg[0]])
            });
          }

        }
        else{
          data[2].forEach(queryid => {
            concatenated.push(queryid[indexAndAvg[0]]);
          });
        }

        if(indexAndAvg[1] == true){
          var avgConcatenated = this.getAvg(concatenated);
          console.log(avgConcatenated)
        }
        else{
          console.log(concatenated);
        }

      }
      else if(keys){
        console.log("all clients")
      }

    })

  }

  /**
   * Gets the index of the required data
   *
   * @param {Number} index - index of the selected y-axis value
   */
  getIndex(index){
    var indexOfMetrice;
    var avg = false;
    var qmph = false;
    switch(index){
      case 0:
        indexOfMetrice = 1;
        break;
      case 1:
        indexOfMetrice = 1;
        avg = true;
        break;
      case 2:
        indexOfMetrice = 2;
        break;
      case 3:
        indexOfMetrice = 3;
        break;
      case 4:
        indexOfMetrice = 1;
        qmph = true;
        break;
    }
    return [indexOfMetrice, avg, qmph]
  }

  /**
   * Calculates and returns average of an array
   * @param {Array} inputData - input array
   */
  getAvg(inputData) {
    var i = 0, sum = 0, len = inputData.length;
    while (i < len) {
        sum = sum + parseInt(inputData[i++]);
    }
    return sum / len;
}

}







