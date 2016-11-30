var YahooFantasy = require('yahoo-fantasy');
var request = require('request');
var cheerio = require('cheerio');
var Table = require('cli-table');
var AsciiTable = require('ascii-table');

exports.handler = function(event, context) {
    
    var raw_rank = new Table({
        head: ['Rank', 'Team', 'FG%', 'FT%', '3PT', 'PT', 'REB', 'AST', 'ST', 'BLK', 'TO', 'TOTAL']
    });
    var raw_stats = new Table({
        head: ['Rank', 'Team', 'GP', 'FG%', 'FT%', '3PT', 'PT', 'REB', 'AST', 'ST', 'BLK', 'TO']
    });
    var prj_stats = new Table({
        head: ['Rank', 'Team', 'GP', 'FG%', 'FT%', '3PT', 'PT', 'REB', 'AST', 'ST', 'BLK', 'TO']
    });
    var prj_rank = new Table({
        head: ['Rank', 'Team', 'GP', 'FG%', 'FT%', '3PT', 'PT', 'REB', 'AST', 'ST', 'BLK', 'TO', 'TOTAL']
    });
    var url = 'http://basketball.fantasysports.yahoo.com/nba/47806/standings'

    nteams = 12
    ncols = 12 // num_cats + 3

    request(url, function(err, resp, body) {
        if (err)
            throw err;

        $ = cheerio.load(body);
        lines = []
        $('.Tst-table td').each(function() {
            lines.push($(this).text())
        });

        // Raw Ranking
        col = 0
        row = []
        lines.slice(0, nteams * ncols).forEach(function(line) {
            row.push(line)
            col += 1
            if (col == ncols) {
                raw_rank.push(row)
                col = 0
                row = []
            }
        });

        // Raw and Projected Stats
        col = 0
        raw_row = []
        prj_row = []
        gp = 0
        lines.slice(nteams * ncols, 2 * nteams * ncols).forEach(function(line) {
            if (col == 2) {
                gp = parseFloat(line)
            }
            if (col > 4) {
                prj_line = (parseFloat(line) / gp).toFixed(2).toString()
            } else {
                prj_line = line
            }
            raw_row.push(line)
            prj_row.push(prj_line)
            col += 1
            if (col == ncols) {
                raw_stats.push(raw_row)
                prj_stats.push(prj_row)
                col = 0
                raw_row = []
                prj_row = []
            }
        });

        // Projected Ranking
        function compareByCol(col) {
            if ((col == 11) || (col == 12)) {
                comp = -1
            } else {
                comp = 1
            }
            return function(a, b) {
                if (parseFloat(a[col]) > parseFloat(b[col])) return comp;
                if (parseFloat(a[col]) < parseFloat(b[col])) return -1 * comp;
                if (parseFloat(a[col]) == parseFloat(b[col])) return 0
            };
        };

        // Display rank/stats as ascii-tables
        prj_stats_atable = (new AsciiTable()).setHeading('Rank', 'Team', 'GP', 'FG%', 'FT%', '3PT', 'PT', 'REB', 'AST', 'ST', 'BLK', 'TO');
        prj_stats.forEach(function(row) {
            prj_stats_atable.addRow(row)
        })
        prj_stats_string = prj_stats_atable.sortColumn(0, function(a, b) {
            return a - b
        }).toString()

        // - assign rank to each cat, use tmp as mutating table
        tmp = prj_stats // note: not deep clone, todo: deep clone
        tmp_cols = [3, 4, 5, 6, 7, 8, 9, 10, 11]
        tmp_cols.forEach(function(col) {
            tmp.sort(compareByCol(col))
            rank = 0
            tmp.forEach(function(row, i) {
                row[col] = (i + 1).toString()
            })
        });

        // - add extra total column
        tmp.forEach(function(row) {
            total = (row.slice(3, 12).map(parseFloat).reduce(function(a, b) {
                return a + b
            })).toString()
            prj_rank.push(row.concat([total]))
        })

        // Display rank/stats as ascii-tables
        prj_rank_atable = (new AsciiTable()).setHeading('Rank', 'Team', 'GP', 'FG%', 'FT%', '3PT', 'PT', 'REB', 'AST', 'ST', 'BLK', 'TO', 'TOTAL');
        prj_rank.forEach(function(row) {
            prj_rank_atable.addRow(row)
        })
        prj_rank_string = prj_rank_atable.sortColumn(12, function(a, b) {
            return b - a
        }).toString();

        context.succeed({
            data: "<pre>" + prj_stats_string + "\n" + prj_rank_string + "</pre>"
        })
    });
}
