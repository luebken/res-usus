import React, { Component } from 'react'
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

export default class BasicTable extends Component {

  componentDidMount() {
    fetch("http://localhost:8080/")
      .then(response => response.json())
      .then((jsonData) => {
        this.setState({ "report": jsonData })
      })
      .catch((error) => {
        console.error(error)
      })
  }

  render() {
    if (!this.state)
      return null;

    const { report } = this.state;

    return [
      <h1>{report.description}</h1>,
      <h2>From: {report.from} to {report.to}</h2>,
      <TableContainer component={Paper} >
        <Table aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>namespace</TableCell>
              <TableCell align="right">count</TableCell>

              <TableCell align="right">cpu.total_usage.mean</TableCell>
              <TableCell align="right">cpu.total_usage.p95</TableCell>
              <TableCell align="right">cpu.total_usage.p99</TableCell>
              <TableCell align="right">cpu.total_usage.max</TableCell>

              <TableCell align="right">memory.usage.mean</TableCell>
              <TableCell align="right">memory.usage.p95</TableCell>
              <TableCell align="right">memory.usage.p99</TableCell>
              <TableCell align="right">memory.usage.max</TableCell>

            </TableRow>
          </TableHead>
          <TableBody>
            {report.data.map((lineitem) => (
              <TableRow key={lineitem.group}>
                <TableCell component="th" scope="row">
                  {lineitem.group}
                </TableCell>
                <TableCell align="right">{lineitem.count}</TableCell>
                <TableCell align="right">{lineitem.cpu.total_usage.mean}</TableCell>
                <TableCell align="right">{lineitem.cpu.total_usage.p95}</TableCell>
                <TableCell align="right">{lineitem.cpu.total_usage.p99}</TableCell>
                <TableCell align="right">{lineitem.cpu.total_usage.max}</TableCell>

                <TableCell align="right">{lineitem.memory.usage.mean}</TableCell>
                <TableCell align="right">{lineitem.memory.usage.p95}</TableCell>
                <TableCell align="right">{lineitem.memory.usage.p99}</TableCell>
                <TableCell align="right">{lineitem.memory.usage.max}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ];
  }
}
