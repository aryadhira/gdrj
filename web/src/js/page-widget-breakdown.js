viewModel.breakdown = new Object()
let bkd = viewModel.breakdown

app.log("ANGKA DI PIVOT CLICKABLE, JIKA SALES MAKA AMBIL DARI LEDGER TRANSACTION, SELAINNYA DARI LEDGER SUMMARY")

bkd.contentIsLoading = ko.observable(false)
bkd.title = ko.observable('Grid Analysis Ideas')
bkd.data = ko.observableArray([])
bkd.detail = ko.observableArray([])
bkd.getParam = () => {
	let orderIndex = { field: 'plmodel.orderindex', name: 'Order' }

	let breakdown = rpt.optionDimensions().find((d) => (d.field == bkd.breakdownBy()))
	let dimensions = bkd.dimensions().concat([breakdown, orderIndex])
	let dataPoints = bkd.dataPoints()
	return rpt.wrapParam(dimensions, dataPoints)
}
bkd.refresh = () => {
	let param = $.extend(true, bkd.getParam(), {
		breakdownBy: bkd.breakdownBy()
	})
	// bkd.data(DATATEMP_BREAKDOWN)
	bkd.contentIsLoading(true)
	app.ajaxPost("/report/summarycalculatedatapivot", param, (res) => {
		let data = _.sortBy(res.Data, (o, v) => 
			parseInt(o.plmodel_orderindex.replace(/PL/g, "")))
		bkd.data(data)
		bkd.emptyGrid()
		bkd.contentIsLoading(false)
		bkd.render()
		window.data = res.Data
	}, () => {
		bkd.emptyGrid()
		bkd.contentIsLoading(false)
	})
}
bkd.refreshOnChange = () => {
	// setTimeout(bkd.refresh, 100)
}
bkd.breakdownBy = ko.observable('customer.channelname')
bkd.dimensions = ko.observableArray([
	{ field: 'plmodel.plheader1', name: ' ' },
	{ field: 'plmodel.plheader2', name: ' ' },
	{ field: 'plmodel.plheader3', name: ' ' }
])
bkd.dataPoints = ko.observableArray([
	{ field: "value1", name: "value1", aggr: "sum" }
])
bkd.clickCell = (o) => {
	let x = $(o).closest("td").index()
	let y = $(o).closest("tr").index()
	// let cat = $(`.breakdown-view .k-grid-header-wrap table tr:eq(1) th:eq(${x}) span`).html()
	// let plheader1 = $(`.breakdown-view .k-grid.k-widget:eq(0) tr:eq(${y}) td:not(.k-first):first > span`).html()

	let pivot = $(`.breakdown-view`).data('kendoPivotGrid')
	let cellInfo = pivot.cellInfo(x, y)
	let param = bkd.getParam()
	param.plheader1 = ''
	param.plheader2 = ''
	param.plheader3 = ''
	param.filters.push({
		Field: bkd.breakdownBy(),
		Op: "$eq",
		Value: app.htmlDecode(cellInfo.columnTuple.members[0].caption)
	})

	cellInfo.rowTuple.members.forEach((d) => {
		if (d.parentName == undefined) {
			return
		}

		let key = d.parentName.split('_').reverse()[0]
		let value = app.htmlDecode(d.name.replace(`${d.parentName}&`, ''))
		param[key] = value
	})

	app.ajaxPost('/report/GetLedgerSummaryDetail', param, (res) => {
		let detail = res.Data.map((d) => { return {
			ID: d.ID,
			CostCenter: d.CC.Name,
			Customer: d.Customer.Name,
			Channel: d.Customer.ChannelName,
			Branch: d.Customer.BranchName,
			Brand: d.Product.Brand,
			Product: d.Product.Name,
			Year: d.Year,
			Amount: d.Value1
		} })

		bkd.detail(detail)
		bkd.renderDetail()
	})
}
bkd.renderDetail = () => {
	$('#modal-detail-ledger-summary').appendTo($('body'))
	$('#modal-detail-ledger-summary').modal('show')

	let columns = [
		{ field: 'Year', width: 60, locked: true, footerTemplate: 'Total :' },
		{ field: 'Amount', width: 80, locked: true, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Amount</div>", footerTemplate: "<div class='align-right'>#=kendo.toString(sum, 'n0')#</div>", format: '{0:nc0}', attributes: { class: 'align-right' } },
		{ field: 'CostCenter', title: 'Cost Center', width: 250 },
		{ field: 'Customer', width: 250 },
		{ field: 'Channel', width: 150 },
		{ field: 'Branch', width: 120 },
		{ field: 'Brand', width: 100 },
		{ field: 'Product', width: 250 },
	]
	let config = {
		dataSource: {
			data: bkd.detail(),
			pageSize: 5,
			aggregate: [
				{ field: "Amount", aggregate: "sum" }
			]
		},
		columns: columns,
		pageable: true,
		resizable: false,
		sortable: true
	}

	setTimeout(() => {
		$('.grid-detail').replaceWith('<div class="grid-detail"></div>')
		$('.grid-detail').kendoGrid(config)
	}, 300)
}
bkd.emptyGrid = () => {
	$('.breakdown-view').replaceWith(`<div class="breakdown-view ez"></div>`)
}
bkd.render = () => {
	let data = bkd.data()
	let schemaModelFields = {}
	let schemaCubeDimensions = {}
	let schemaCubeMeasures = {}
	let rows = []
	let columns = []
	let measures = []
	let breakdown = rpt.optionDimensions().find((d) => (d.field == bkd.breakdownBy()))

	app.koUnmap(bkd.dimensions).concat([breakdown]).forEach((d, i) => {
		let field = app.idAble(d.field)
		schemaModelFields[field] = { type: 'string' }
		schemaCubeDimensions[field] = { caption: d.name }

		if (field.indexOf('plheader') > -1) {
			rows.push({ name: field, expand: (rows.length == 0) })
		} else {
			columns.push({ name: field, expand: true })
		}

		rows = rows.slice(0, 2)
	})

	app.koUnmap(bkd.dataPoints).forEach((d) => {
		let measurement = 'Amount'
		let field = app.idAble(d.field)
		schemaModelFields[field] = { type: 'number' }
		schemaCubeMeasures[measurement] = { field: field, aggregate: 'sum', format: '{0:n2}' }
		measures.push(measurement)
	})

	bkd.emptyGrid()
	let wrapper = app.newEl('div').addClass('pivot-pnl')
		.appendTo($('.breakdown-view'))
	let tableHeader = app.newEl('table')
		.appendTo(wrapper)
		.css({
		    float: 'left',
		    width: '200px'
		})

	let tableContent = app.newEl('table')
		.appendTo(wrapper)

	let header = Lazy(data)
		.groupBy((d) => d[app.idAble(bkd.breakdownBy())])
		.map((v, k) => k).toArray()
			
	let trTopHeader = app.newEl('tr')
		.appendTo(tableHeader)

	let tdTopHead = app.newEl('th')
		.appendTo(trTopHeader)
		.html("P&L")

	let trTopBody = app.newEl('tr')
		.appendTo(tableContent)

	header.forEach((d) => {
		let tdTopBody = app.newEl('th')
			.css('width', 150)
			.css('text-align', 'right')
			.html(d)
			.appendTo(trTopBody)
	})

	let i = 0
	let j = 0

	Lazy(data)
		.groupBy((v) => v.plmodel_plheader1)
		.map((v, k) => app.o({ key: k, data: v }))
		.each((d, i) => {

			let trHeader = app.newEl('tr')
				.appendTo(tableHeader)

			let tdHead = app.newEl('td')
				.appendTo(trHeader)
				.html(d.key)

			let trBody = app.newEl('tr')
				.appendTo(tableContent)

			let rowHeader1 = Lazy(d.data)
				.groupBy((k) => k[app.idAble(bkd.breakdownBy())])
				.map((v, k) => app.o({ key: k, data: v }))
				.toArray()

			header.forEach((d) => {
				let val = Lazy(rowHeader1).filter((e) => e.key == d).sum((e) => Lazy(e.data).sum((e) => e.value1))
				// if (row != undefined) {
				// 	val = Lazy(row.data).sum((g) => g.value1)
				// }

				console.log("------", d, val)
				// console.log("----", d, Lazy(rowHeader1).filter((e) => e[bkd.breakdownBy()] == d).toArray())

				let tdEachCell = app.newEl('td')
					.appendTo(trBody)
					.html(kendo.toString(val, 'n0'))
					.css('text-align', 'right')
					.width(80)

				j++
			})

			i++
		})
}

$(() => {
	bkd.refresh()
})
