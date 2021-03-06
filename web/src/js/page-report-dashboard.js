// cd $GOPATH/src/eaciit/gdrj && cat config/configurations.json

// let plcodes = [
// 	{ plcodes: ["PL1", "PL2", "PL3", "PL4", "PL5", "PL6"], title: 'Gross Sales' },
// 	// growth
// 	{ plcodes: ["PL7", "PL8"], title: 'Sales Discount' },
// 	// ATL
// 	// BTL
// 	{ plcode: "PL74B", title: "COGS" },
// 	{ plcode: "PL74C", title: "Gross Margin" },
// 	{ plcode: "PL94A", title: "SGNA" },
// 	{ plcode: "PL26", title: "Royalties" }
// 	{ plcode: "PL44B", title: "EBIT" },
// 	{ plcode: "PL44C", title: "EBITDA" },





// 	{ plcode: "PL74C", title: "GM" },
// 	{ plcode: "PL74B", title: "COGS" },
// 	{ plcode: "PL44B", title: "EBIT" },
// 	{ plcode: "PL44C", title: "EBITDA" },
// 	{ plcode: "PL8A", title: "Net Sales" },

// ]

vm.currentMenu('Dashboard')
vm.currentTitle("Dashboard")
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Dashboard', href: '/report/dashboard' }
])

viewModel.dashboard = {}
let dsbrd = viewModel.dashboard

dsbrd.rows = ko.observableArray([
	{ pnl: 'Gross Sales', plcodes: ["PL1", "PL2", "PL3", "PL4", "PL5", "PL6"] },
	{ pnl: 'Growth', plcodes: [] }, // NOT YET
	{ pnl: 'Sales Discount', plcodes: ["PL7", "PL8"] },
	// { pnl: 'ATL', plcodes: ["PL28"] },
	// { pnl: 'BTL', plcodes: ["PL29", "PL30", "PL31", "PL32"] },
	{ pnl: "COGS", plcodes: ["PL74B"] },
	{ pnl: "Gross Margin", plcodes: ["PL74C"] },
	{ pnl: "SGA", plcodes: ["PL94A"] },
	{ pnl: "Royalties", plcodes: ["PL26A"] },
	{ pnl: "EBITDA", plcodes: ["PL44C"] },
	{ pnl: "EBIT %", plcodes: [] },
	{ pnl: "EBIT", plcodes: ["PL44B"] },
])

dsbrd.data = ko.observableArray([])
dsbrd.columns = ko.observableArray([])
dsbrd.breakdown = ko.observable('customer.channelname')
dsbrd.fiscalYears = ko.observableArray(rpt.value.FiscalYears())
dsbrd.contentIsLoading = ko.observable(false)
dsbrd.optionStructures = ko.observableArray([
	{ field: "date.fiscal", name: "Fiscal Year" },
	{ field: "date.quartertxt", name: "Quarter" },
	{ field: "date.month", name: "Month" }
])
dsbrd.structure = ko.observable(dsbrd.optionStructures()[0].field)
dsbrd.structureYear = ko.observable('date.year')
dsbrd.optionBreakdownValues = ko.observableArray([])
dsbrd.breakdownValue = ko.observableArray([])
dsbrd.breakdownValueAll = { _id: 'All', Name: 'All' }
dsbrd.changeBreakdown = () => {
	let all = dsbrd.breakdownValueAll
	let map = (arr) => arr.map((d) => {
		if (dsbrd.breakdown() == "customer.channelname") {
			return d
		}

		return { _id: d.Name, Name: d.Name }
	})
	setTimeout(() => {
		switch (dsbrd.breakdown()) {
			case "customer.branchname":
				dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Branch())))
				dsbrd.breakdownValue([all._id])
			break;
			case "product.brand":
				dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Brand())))
				dsbrd.breakdownValue([all._id])
			break;
			case "customer.channelname":
				dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Channel())))
				dsbrd.breakdownValue([all._id])
			break;
			case "customer.zone":
				dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Zone())))
				dsbrd.breakdownValue([all._id])
			break;
			case "customer.areaname":
				dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Area())))
				dsbrd.breakdownValue([all._id])
			break;
			case "customer.region":
				dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.Region())))
				dsbrd.breakdownValue([all._id])
			break;
			case "customer.keyaccount":
				dsbrd.optionBreakdownValues([all].concat(map(rpt.masterData.KeyAccount())))
				dsbrd.breakdownValue([all._id])
			break;
		}
	}, 100)
}

dsbrd.changeBreakdownValue = () => {
	let all = dsbrd.breakdownValueAll
	setTimeout(() => {
		console.log("-----", dsbrd.breakdownValue())

		let condA1 = dsbrd.breakdownValue().length == 2
		let condA2 = dsbrd.breakdownValue().indexOf(all._id) == 0
		if (condA1 && condA2) {
			dsbrd.breakdownValue.remove(all._id)
			return
		}

		let condB1 = dsbrd.breakdownValue().length > 1
		let condB2 = dsbrd.breakdownValue().reverse()[0] == all._id
		if (condB1 && condB2) {
			dsbrd.breakdownValue([all._id])
			return
		}

		let condC1 = dsbrd.breakdownValue().length == 0
		if (condC1) {
			dsbrd.breakdownValue([all._id])
		}
	}, 100)
}

dsbrd.refresh = () => {
	if (dsbrd.breakdownValue().length == 0) {
		toolkit.showError('Please choose at least breakdown value')
		return
	}

	let param = {}
	param.pls = _.flatten(dsbrd.rows().map((d) => d.plcodes))
	param.groups = rpt.parseGroups([dsbrd.breakdown(), dsbrd.structure()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(true, dsbrd.fiscalYears)

	let breakdownValue = dsbrd.breakdownValue().filter((d) => d != 'All')
	if (breakdownValue.length > 0) {
		param.filters.push({
			Field: dsbrd.breakdown(),
			Op: '$in',
			Value: dsbrd.breakdownValue()
		})
	}

	if (dsbrd.structure() == 'date.month') {
		param.groups.push(dsbrd.structureYear())
	}

	let fetch = () => {
		toolkit.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}

			dsbrd.contentIsLoading(false)
			dsbrd.render(res)
		}, () => {
			dsbrd.contentIsLoading(false)
		})
	}

	dsbrd.contentIsLoading(true)
	fetch()
}

dsbrd.render = (res) => {
	let rows = []
	let rowsAfter = []
	let columnsPlaceholder = [{ 
		field: 'pnl', 
		title: 'PNL', 
		attributes: { class: 'bold' }, 
		headerAttributes: { style: 'font-weight: bold; vertical-align: middle;' }, 
		width: 120
	}, { 
		field: 'total', 
		title: 'Total', 
		attributes: { class: 'bold align-right bold' }, 
		headerAttributes: { style: 'font-weight: bold; vertical-align: middle; text-align: right;' }, 
		width: 150
	}]

	let data = res.Data.Data

	dsbrd.rows().forEach((row, rowIndex) => {
		row.columnData = []
		data.forEach((column, columnIndex) => {
			let columnAfter = {
				breakdownTitle: toolkit.redefine(column._id[`_id_${toolkit.replace(dsbrd.breakdown(), '.', '_')}`]), 
				structureTitle: toolkit.redefine(column._id[`_id_${toolkit.replace(dsbrd.structure(), '.', '_')}`]), 
				structureYearTitle: toolkit.redefine(column._id[`_id_${toolkit.replace(dsbrd.structureYear(), '.', '_')}`]), 
				original: toolkit.sum(row.plcodes, (plcode) => toolkit.number(column[plcode])),
				value: toolkit.sum(row.plcodes, (plcode) => toolkit.number(column[plcode])),
			}

			row.columnData.push(columnAfter)
		})

		rowsAfter.push(row)
	})

	if (rowsAfter.length > 0) {
		let grossSales = rowsAfter.find((d) => d.pnl == 'Gross Sales')
		let ebit = rowsAfter.find((d) => d.pnl == 'EBIT')
		let columns = rowsAfter[0].columnData

		rowsAfter.forEach((row, rowIndex) => {
			row.columnData.forEach((column, columnIndex) => {
				if (row.pnl == 'EBIT %') {
					let percentage = kendo.toString(toolkit.number(ebit.columnData[columnIndex].original / grossSales.columnData[columnIndex].original) * 100, 'n2')
					column.value = `${percentage} %`;
				} else if (row.pnl != 'Gross Sales' && row.pnl != 'EBIT') {
					let percentage = kendo.toString(toolkit.number(column.original / grossSales.columnData[columnIndex].original) * 100, 'n2')
					column.value = `${percentage} %`;
				}
			})

			let total = toolkit.sum(row.columnData, (d) => d.original)
			row.total = kendo.toString(total, 'n0')
			if (row.pnl == 'EBIT %') {
				let totalGrossSales = toolkit.sum(grossSales.columnData, (d) => d.original)
				let totalEbit = toolkit.sum(ebit.columnData, (d) => d.original)
				let percentage = toolkit.number(totalEbit / totalGrossSales) * 100
				row.total = `${kendo.toString(percentage, 'n2')} %`
			}
		})
	}

	let columnData = []
	data.forEach((d, i) => {
		let columnInfo = rowsAfter[0].columnData[i]

		let column = {}
		column.field = `columnData[${i}].value`
		column.breakdown = $.trim(toolkit.redefine(columnInfo.breakdownTitle, ''))
		column.title = $.trim(columnInfo.structureTitle)
		column.width = 150
		column.format = '{0:n0}'
		column.attributes = { class: 'align-right' }
		column.headerAttributes = { 
			style: 'text-align: center !important; font-weight: bold; border-right: 1px solid white; ',
		}

		if (dsbrd.structure() == 'date.month') {
			column.titleYear = $.trim(columnInfo.structureYearTitle)
		}

		columnData.push(column)
	})

	let op1 = _.groupBy(columnData, (d) => d.breakdown)
	let op2 = _.map(op1, (v, k) => { 
		v.forEach((h) => {
			h.month = h.title
			h.year = h.titleYear

			if (dsbrd.structure() == 'date.month') {
				let month = moment(new Date(2015, parseInt(h.title, 10) - 1, 1)).format('MMMM')
				h.title = month

				if (rpt.value.FiscalYears().length > 1) {
					h.title = `${month} ${h.titleYear}`
				}
			}
		})

		return { 
			title: ($.trim(k) == '' ? '' : k), 
			columns: v,
			headerAttributes: { 
				style: 'text-align: center !important; font-weight: bold; border: 1px solid white; border-top: none; border-left: none; box-sizing: border-box; background-color: #e9eced;',
			}
		}
	})
	let columnGrouped = _.sortBy(op2, (d) => d.title)

	op2.forEach((d) => {
		d.columns = _.sortBy(d.columns, (e) => {
			if (dsbrd.structure() == 'date.month') {
				let monthString = `0${e.month}`.split('').reverse().slice(0, 2).reverse().join('')
				
				if (rpt.value.FiscalYears().length > 1) {
					let yearMonthString = `${e.year}${monthString}`
					return yearMonthString
				}

				return monthString
			}

			return e.title
		})
	})

	if (columnGrouped.length > 1) {
		columnsPlaceholder[0].locked = true
		columnsPlaceholder[1].locked = true
	}

	dsbrd.data(rowsAfter)
	dsbrd.columns(columnsPlaceholder.concat(columnGrouped))

	let grossSales = dsbrd.data().find((d) => d.pnl == "Gross Sales")
	let growth = dsbrd.data().find((d) => d.pnl == "Growth")

	let counter = 0
	let prevIndex = 0
	columnGrouped.forEach((d) => {
		d.columns.forEach((e, i) => {
			let index = toolkit.getNumberFromString(e.field)

			if ((i + 1) == d.columns.length) {
				e.attributes.style = `${e.attributes.style}; border-right: 1px solid rgb(240, 243, 244);`
			}

			if (i == 0) {
				prevIndex = index
				counter++
				return
			}

			let gs = grossSales.columnData[index]
			let gsPrev = grossSales.columnData[prevIndex]
			let g = growth.columnData[index]
			let value = toolkit.number((gs.value - gsPrev.value) / gsPrev.value) * 100
			g.value = `${kendo.toString(value, 'n2')} %`

			counter++
			prevIndex = index
		})
	})

	let config = {
		dataSource: {
			data: dsbrd.data()
		},
		columns: dsbrd.columns(),
		resizable: false,
		sortable: false, 
		pageable: false,
		filterable: false,
		dataBound: () => {
			let sel = '.grid-dashboard .k-grid-content-locked tr, .grid-dashboard .k-grid-content tr'

			$(sel).on('mouseenter', function () {
				let index = $(this).index()
				console.log(this, index)
		        let elh = $(`.grid-dashboard .k-grid-content-locked tr:eq(${index})`).addClass('hover')
		        let elc = $(`.grid-dashboard .k-grid-content tr:eq(${index})`).addClass('hover')
			})
			$(sel).on('mouseleave', function () {
				$('.grid-dashboard tr.hover').removeClass('hover')
			})
		}
	}

	$('.grid-dashboard').replaceWith('<div class="grid-dashboard"></div>')
	$('.grid-dashboard').kendoGrid(config)
}






viewModel.dashboardRanking = {}
let rank = viewModel.dashboardRanking

rank.breakdown = ko.observable('customer.channelname')
rank.columns = ko.observableArray([
	{ field: 'pnl', title: 'PNL', attributes: { class: 'bold' } },
	{ field: 'gmPercentage', template: (d) => `${kendo.toString(d.gmPercentage, 'n2')} %`, title: 'GM %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' } },
	{ field: 'cogsPercentage', template: (d) => `${kendo.toString(d.cogsPercentage, 'n2')} %`, title: 'COGS %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' } },
	{ field: 'ebitPercentage', template: (d) => `${kendo.toString(d.ebitPercentage, 'n2')} %`, title: 'EBIT %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' } },
	{ field: 'ebitdaPercentage', template: (d) => `${kendo.toString(d.ebitdaPercentage, 'n2')} %`, title: 'EBITDA %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' } },
	{ field: 'netSales', title: 'Net Sales', type: 'number', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n0}' },
	{ field: 'ebit', title: 'EBIT', type: 'number', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n0}' },
])
rank.contentIsLoading = ko.observable(false)
rank.data = ko.observableArray([])
rank.fiscalYear = ko.observable(rpt.value.FiscalYear())

rank.refresh = () => {
	let param = {}
	param.pls = ["PL74C", "PL74B", "PL44B", "PL44C", "PL8A"]
	param.groups = rpt.parseGroups([rank.breakdown()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, rank.fiscalYear)

	let fetch = () => {
		toolkit.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}

			rank.contentIsLoading(false)
			rank.render(res)
		}, () => {
			rank.contentIsLoading(false)
		})
	}

	rank.contentIsLoading(true)
	fetch()
}

rank.render = (res) => {
	let data = _.sortBy(res.Data.Data, (d) => toolkit.redefine(d._id[`_id_${toolkit.replace(dsbrd.breakdown(), '.', '_')}`], ''))

	let rows = []
	data.forEach((d) => {
		let row = {}
		row.original = d._id[`_id_${toolkit.replace(rank.breakdown(), '.', '_')}`]
		row.pnl = d._id[`_id_${toolkit.replace(rank.breakdown(), '.', '_')}`]
		if ($.trim(row.pnl) == '') {
			row.original = ''
			row.pnl = ''
		}
		if (rank.breakdown() == 'date.month') {
			row.original = (parseInt(row.pnl, 10) - 1)
			row.pnl = moment(new Date(2015, row.original, 1)).format('MMMM')
		}


		row.gmPercentage = toolkit.number(d.PL74C / d.PL8A) * 100
		row.cogsPercentage = toolkit.number(d.PL74B / d.PL8A) * 100
		row.ebitPercentage = toolkit.number(d.PL44B / d.PL8A) * 100
		row.ebitdaPercentage = toolkit.number(d.PL44C / d.PL8A) * 100
		row.netSales = d.PL8A
		row.ebit = d.PL44B
		rows.push(row)
	})

	console.log("---", rows)
	rank.data(_.sortBy(rows, (d) => d.original))

	let config = {
		dataSource: {
			data: rank.data(),
			pageSize: 10,
		},
		columns: rank.columns(),
		resizabl: false,
		sortable: true, 
		pageable: true,
		filterable: false,
		dataBound: app.gridBoundTooltipster('.grid-ranking')
	}

	$('.grid-ranking').replaceWith('<div class="grid-ranking sortable"></div>')
	$('.grid-ranking').kendoGrid(config)
}





viewModel.salesDistribution = {}
let sd = viewModel.salesDistribution
sd.contentIsLoading = ko.observable(false)
sd.isFirstTime = ko.observable(true)
sd.breakdown = ko.observable('customer.reportchannel')
sd.breakdownSub = ko.observable('customer.reportsubchannel')
sd.data = ko.observableArray([])
sd.fiscalYear = ko.observable(rpt.value.FiscalYear())
sd.render = (res) => {
	let isFirstTime = sd.isFirstTime()
	sd.isFirstTime(false)

	let data = res.Data.Data

	let breakdown = toolkit.replace(sd.breakdown(), ".", "_")
	let total = toolkit.sum(data, (d) => d.PL8A)

	sd.data(data)

	let rows = data.map((d) => {
		let row = {}
		row[breakdown] = d._id[`_id_${breakdown}`]
		row.group = d._id[`_id_${toolkit.replace(sd.breakdownSub(), '.', '_')}`]
		row.percentage = toolkit.number(d.PL8A / total) * 100
		row.value = d.PL8A
		return row
	})

	sd.data(_.sortBy(rows, (d) => {
		let subGroup = `00${toolkit.number(toolkit.getNumberFromString(d.group))}`.split('').reverse().splice(0, 2).reverse().join('')
		let group = d[breakdown]

		switch (d[breakdown]) {
			case "MT": group = "A"; break
			case "GT": group = "B"; break
			case "IT": group = "C"; break
		}

		return [group, subGroup].join(' ')
	}))

	let op0 = _.filter(sd.data(), (d) => d.percentage > 0 || d.value > 0)
	let op1 = _.groupBy(op0, (d) => d[breakdown])
	let op2 = _.map(op1, (v, k) => { return { key: k, values: v } })
	let maxRow = _.maxBy(op2, (d) => d.values.length)
	let maxRowIndex = op2.indexOf(maxRow)
	let height = 20 * maxRow.values.length
	let width = 320

	let container = $('.grid-sales-dist').empty()
	let table = toolkit.newEl('table').addClass('width-full').appendTo(container).height(height)
	let tr1st = toolkit.newEl('tr').appendTo(table)
	let tr2nd = toolkit.newEl('tr').appendTo(table)

	table.css('max-width', `${op2.length * width}px`)

	let index = 0
	op2.forEach((d) => {
		let td1st = toolkit.newEl('td').appendTo(tr1st).addClass('sortsales').attr('sort', sd.sortVal[index]).css('cursor', 'pointer')
		let sumPercentage = _.sumBy(d.values, (e) => e.percentage)
		let sumColumn = _.sumBy(d.values, (e) => e.value)
		td1st.html(`<i class="fa"></i>${d.key}<br />${kendo.toString(sumPercentage, 'n2')} %`)

		let td2nd = toolkit.newEl('td').appendTo(tr2nd)

		let innerTable = toolkit.newEl('table').appendTo(td2nd)

		if (d.values.length == 1) {
			let tr = toolkit.newEl('tr').appendTo(innerTable)
			toolkit.newEl('td').appendTo(tr).html(kendo.toString(d.values[0].value, 'n0')).height(height).addClass('single')
			return
		}

		let channelgroup = _.map(_.groupBy(d.values, (o) => { return o.group }), (v, k) => {
			if (k == '')
				k = '' 
			return { key: k, values: v } 
		})
		let totalyo = 0, percentageyo = 0, indexyo = 0
		channelgroup.forEach((e) => {
			totalyo = toolkit.sum(e.values, (b) => b.value)
			percentageyo = toolkit.number(totalyo/sumColumn*100)
			channelgroup[indexyo]['totalyo'] = totalyo
			channelgroup[indexyo]['percentageyo'] = percentageyo
			indexyo++
		})
		if (sd.sortVal[index] == ''){
			channelgroup = _.orderBy(channelgroup, ['key'], ['asc'])
			$(`.sortsales:eq(${index})>i`).removeClass('fa-chevron-up')
			$(`.sortsales:eq(${index})>i`).removeClass('fa-chevron-down')
		} else if (sd.sortVal[index] == 'asc'){
			channelgroup = _.orderBy(channelgroup, ['totalyo'], ['asc'])
			$(`.sortsales:eq(${index})>i`).removeClass('fa-chevron-up')
			$(`.sortsales:eq(${index})>i`).addClass('fa-chevron-down')
		} else if (sd.sortVal[index] == 'desc'){
			channelgroup = _.orderBy(channelgroup, ['totalyo'], ['desc'])
			$(`.sortsales:eq(${index})>i`).addClass('fa-chevron-up')
			$(`.sortsales:eq(${index})>i`).removeClass('fa-chevron-down')
		}

		if (isFirstTime) {
			if (d.key == "MT") {
				channelgroup = _.orderBy(channelgroup, (d) => {
					switch (d.key) {
						case 'Hyper': return 'A'; break
						case 'Super': return 'B'; break
						case 'Mini': return 'C'; break
					}

					return d.key
				}, 'asc')
			} else if (d.key == 'GT') {
				channelgroup = _.orderBy(channelgroup, (d) => toolkit.getNumberFromString(d.key), 'asc')
			}
		}

		channelgroup.forEach((e) => {
			let tr = toolkit.newEl('tr').appendTo(innerTable)
			toolkit.newEl('td').css('width', '150px').appendTo(tr).html(e.key).height(height / channelgroup.length)
			toolkit.newEl('td').css('width', '40px').appendTo(tr).html(`${kendo.toString(e.percentageyo, 'n2')}&nbsp;%`)
			toolkit.newEl('td').css('width', '120px').appendTo(tr).html(kendo.toString(e.totalyo, 'n0'))
		})
		index++
		// d.values.forEach((e) => {
		// 	let tr = toolkit.newEl('tr').appendTo(innerTable)
		// 	toolkit.newEl('td').appendTo(tr).html(e[breakdown]).height(height / d.values.length)
		// 	toolkit.newEl('td').appendTo(tr).html(`${kendo.toString(e.percentage, 'n2')} %`)
		// 	toolkit.newEl('td').appendTo(tr).html(kendo.toString(e.value, 'n0'))
		// })
	})

	let trTotal = toolkit.newEl('tr').appendTo(table)
	let tdTotal = toolkit.newEl('td').addClass('align-center total').attr('colspan', op2.length).appendTo(trTotal).html(kendo.toString(total, 'n0'))
	$(".grid-sales-dist>table tbody>tr:eq(1) td").each(function(index) {
		$(this).find('table').height($(".grid-sales-dist>table tbody>tr:eq(1)").height())
	})
}
sd.sortVal = ['','','']
sd.sortData = () => {
	sd.render(sd.oldData())
}
sd.oldData = ko.observable({})
sd.refresh = () => {
	let param = {}
	param.pls = ["PL8A"]
	param.groups = rpt.parseGroups([sd.breakdown(), sd.breakdownSub()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, sd.fiscalYear)

	let fetch = () => {
		toolkit.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}
	
			sd.oldData(res)
			sd.contentIsLoading(false)
			sd.render(res)
		}, () => {
			sd.contentIsLoading(false)
		})
	}

	sd.contentIsLoading(true)
	fetch()
}
sd.initSort = () => {
	$(".grid-sales-dist").on('click', '.sortsales', function(){
		let sort = $(this).attr('sort'), index = $(this).index(), res = ''
		if (sort == undefined || sort == '')
			res = 'asc'
		else if (sort == 'asc')
			res = 'desc'
		else
			res = ''

		sd.sortVal[index] = res
		sd.sortData()
	})
}

$(() => {
	rpt.refreshView('dashboard')

	dsbrd.changeBreakdown()
	setTimeout(() => {
		dsbrd.breakdownValue(['All'])
		dsbrd.refresh()
	}, 200)

	rank.refresh()
	sd.refresh()
	sd.initSort()
})
