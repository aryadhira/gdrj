package gdrj

import (
	"errors"
	"fmt"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"strings"
	"time"
)

type LedgerSummary struct {
	orm.ModelBase                          `bson:"-" json:"-"`
	ID                                     string `bson:"_id"`
	PC                                     *ProfitCenter
	CC                                     *CostCenter
	PLModel                                *PLModel
	CompanyCode                            string
	LedgerAccount                          string
	Customer                               *Customer
	Product                                *Product
	Date                                   *Date
	PLGroup1, PLGroup2, PLGroup3, PLGroup4 string
	Value1, Value2, Value3                 float64
	//EasyForSelect
	PCID, CCID, OutletID, SKUID, PLCode, PLOrder string
	Month                                        time.Month
	Year                                         int
	Source                                       string
}

// month,year
func (s *LedgerSummary) RecordID() interface{} {
	return s.ID
	//return toolkit.Sprintf("%d_%d_%s_%s", s.Date.Year, s.Date.Month, s.CompanyCode, s.LedgerAccount)
}

func (s *LedgerSummary) PrepareID() interface{} {
	return toolkit.Sprintf("%d_%d_%s_%s_%s_%s_%s_%s_%s",
		s.Date.Year, s.Date.Month,
		s.CompanyCode, s.LedgerAccount,
		s.PLCode, s.OutletID, s.SKUID, s.PCID, s.CCID)
}

func (s *LedgerSummary) TableName() string {
	return "ledgersummaries" //"ledgersummaries"// "pldatamodels" //

	// 	go.eaciit.com:27123
	// go.eaciit.com:27123
}

func (s *LedgerSummary) PreSave() error {
	s.ID = s.PrepareID().(string)
	return nil
}

func GetUniqueBreakDown(breakdown string) []string {
	return nil
}

func LedgerSummaryGetDetailPivot(payload *DetailParam) ([]*LedgerSummary, error) {
	filters := []*dbox.Filter{
		dbox.Eq("plmodel.plheader1", payload.PLHeader1),
	}

	if payload.PLHeader2 != "" {
		filters = append(filters, dbox.Eq("plmodel.plheader2", payload.PLHeader2))
	}

	if payload.PLHeader3 != "" {
		filters = append(filters, dbox.Eq("plmodel.plheader3", payload.PLHeader3))
	}

	for _, each := range filters {
		fmt.Println("++++++", *each)
	}

	filter := dbox.And(payload.ParseFilter(), dbox.And(filters...))

	cursor, err := Find(new(LedgerSummary), filter, nil)
	if err != nil {
		return nil, err
	}

	result := []*LedgerSummary{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}

func GetLedgerSummaryByDetail(LedgerAccount, PCID, CCID, OutletID, SKUID string, Year int, Month time.Month) (ls *LedgerSummary) {
	ls = new(LedgerSummary)

	filter := dbox.And(dbox.Eq("month", Month),
		dbox.Eq("year", Year),
		dbox.Eq("ledgeraccount", LedgerAccount),
		dbox.Eq("pcid", PCID),
		dbox.Eq("ccid", CCID),
		dbox.Eq("outletid", OutletID),
		dbox.Eq("skuid", SKUID))

	cr, err := Find(new(LedgerSummary), filter, nil)
	if err != nil {
		return
	}

	_ = cr.Fetch(&ls, 1, false)
	cr.Close()

	return
}

func CalculateLedgerSummaryAnalysisIdea(payload *PivotParam) ([]*toolkit.M, error) {
	var filter *dbox.Filter = payload.ParseFilter()

	conn := DB().Connection
	q := conn.NewQuery().From(new(LedgerSummary).TableName())
	q = q.Where(filter)
	q = q.Group("plmodel._id", "plmodel.orderindex", "plmodel.plheader1", "plmodel.plheader2", "plmodel.plheader3")
	q = q.Aggr(dbox.AggrSum, "$value1", "value1")

	c, e := q.Cursor(nil)
	if e != nil {
		return nil, errors.New("SummarizedLedgerSum: Preparing cursor error " + e.Error())
	}
	defer c.Close()

	ms := []*toolkit.M{}
	e = c.Fetch(&ms, 0, false)
	if e != nil {
		return nil, errors.New("SummarizedLedgerSum: Fetch cursor error " + e.Error())
	}

	res := []*toolkit.M{}
	for _, each := range ms {
		o := toolkit.M{}
		o.Set("_id", each.Get("_id").(toolkit.M).Get("plmodel._id"))
		o.Set("orderindex", each.Get("_id").(toolkit.M).Get("plmodel.orderindex"))
		o.Set("plheader1", each.Get("_id").(toolkit.M).Get("plmodel.plheader1"))
		o.Set("plheader2", each.Get("_id").(toolkit.M).Get("plmodel.plheader2"))
		o.Set("plheader3", each.Get("_id").(toolkit.M).Get("plmodel.plheader3"))
		o.Set("value", each.Get("value1"))
		res = append(res, &o)
	}

	return res, nil
}

func CalculateLedgerSummary(payload *PivotParam) ([]*toolkit.M, error) {
	var filter *dbox.Filter = payload.ParseFilter()
	var columns []string = payload.ParseDimensions()
	var datapoints []string = payload.ParseDataPoints()
	var fnTransform (func(m *toolkit.M) error) = nil

	bunchData, err := SummarizeLedgerSum(filter, columns, datapoints, fnTransform)
	if err != nil {
		return nil, err
	}

	rows := []*toolkit.M{}

	for _, each := range bunchData {
		row := toolkit.M{}

		for _, eachCol := range payload.Dimensions {
			key := strings.Replace(eachCol.Field, ".", "_", -1)
			val := each.Get("_id").(toolkit.M).Get(key)
			row.Set(key, val)
		}

		for _, eachRow := range payload.DataPoints {
			key := strings.Replace(eachRow.Field, ".", "_", -1)
			val := each.Get(key)
			row.Set(key, val)
		}

		rows = append(rows, &row)
	}

	return rows, nil
}

func SummarizeLedgerSum(
	filter *dbox.Filter,
	columns []string,
	datapoints []string,
	fnTransform func(m *toolkit.M) error) ([]*toolkit.M, error) {
	conn := DB().Connection
	q := conn.NewQuery().From(new(LedgerSummary).TableName())
	if filter != nil {
		q = q.Where(filter)
	}

	if len(columns) > 0 {
		cs := []string{}
		for i := range columns {
			cs = append(cs, strings.ToLower(columns[i]))
		}
		q = q.Group(cs...)
	}
	if len(datapoints) == 0 {
		return nil, errors.New("SummarizedLedgerSum: Datapoints should be defined at least 1")
	}
	for _, dp := range datapoints {
		dps := strings.Split(strings.ToLower(dp), ":")
		if len(dps) < 2 {
			return nil, errors.New("SummarizeLedgerSum: Parameters should follow this pattern aggrOp:fieldName:[alias - optional]")
		}

		fieldid := dps[1]
		alias := fieldid
		op := ""
		if !strings.HasPrefix(dps[0], "$") {
			dps[0] = "$" + strings.ToLower(dps[0])
		}

		if toolkit.HasMember([]string{dbox.AggrSum, dbox.AggrAvr, dbox.AggrMax,
			dbox.AggrMin, dbox.AggrMean, dbox.AggrMed}, dps[0]) {
			op = dps[0]
		}
		if op == "" {
			return nil, errors.New("SummarizeLedgerSum: Invalid Operation")
		}
		if len(dps) > 2 {
			alias = dps[2]
		}

		if strings.HasPrefix(alias, "$") {
			alias = alias[1:]
		}

		if fnumber, enumber := toolkit.IsStringNumber(fieldid, "."); enumber == nil {
			q = q.Aggr(op, fnumber, alias)
		} else {
			q = q.Aggr(op, fieldid, alias)
		}
	}

	c, e := q.Cursor(nil)
	if e != nil {
		return nil, errors.New("SummarizedLedgerSum: Preparing cursor error " + e.Error())
	}
	defer c.Close()

	ms := []*toolkit.M{}
	e = c.Fetch(&ms, 0, false)
	if e != nil {
		return nil, errors.New("SummarizedLedgerSum: Fetch cursor error " + e.Error())
	}

	if fnTransform != nil {
		for idx, m := range ms {
			e = fnTransform(m)
			if e != nil {
				return nil, errors.New(toolkit.Sprintf("SummarizedLedgerSum: Transform error on index %d, %s",
					idx, e.Error()))
			}
		}
	}

	return ms, nil
}

func (s *LedgerSummary) Save() error {
	e := Save(s)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", s.TableName(), "save", e.Error()))
	}
	return e
}

type DetailParam struct {
	PivotParam
	PLHeader1 string `json:"plheader1"`
	PLHeader2 string `json:"plheader2"`
	PLHeader3 string `json:"plheader3"`
}

type PivotParam struct {
	Dimensions []*PivotParamDimensions `json:"dimensions"`
	DataPoints []*PivotParamDataPoint  `json:"datapoints"`
	Which      string                  `json:"which"`
	Filters    []toolkit.M             `json:"filters"`
	Note       string                  `json:"note"`
}

type PivotParamDimensions struct {
	Field string `json:"field"`
}

type PivotParamDataPoint struct {
	Aggr  string `json:"aggr"`
	Field string `json:"field"`
}

func (p *PivotParam) ParseDimensions() (res []string) {
	res = []string{}
	for _, each := range p.Dimensions {
		res = append(res, each.Field)
	}
	return
}

func (p *PivotParam) ParseDataPoints() (res []string) {
	for _, each := range p.DataPoints {
		parts := []string{each.Aggr, each.Field, each.Field}

		if !strings.HasPrefix(parts[1], "$") {
			parts[1] = fmt.Sprintf("$%s", parts[1])
		}

		res = append(res, strings.Join(parts, ":"))
	}
	return
}

func (p *PivotParam) ParseFilter() *dbox.Filter {
	filters := []*dbox.Filter{}

	for _, each := range p.Filters {
		field := each.GetString("Field")

		switch each.GetString("Op") {
		case dbox.FilterOpIn:
			values := []string{}
			for _, v := range each.Get("Value").([]interface{}) {
				values = append(values, v.(string))
			}

			if len(values) > 0 {
				filters = append(filters, dbox.In(field, values))
			}
		case dbox.FilterOpGte:
			var value interface{} = each.GetString("Value")

			if value.(string) != "" {
				if field == "year" {
					t, err := time.Parse(time.RFC3339Nano, value.(string))
					if err != nil {
						fmt.Println(err.Error())
					} else {
						value = t.Year()
					}
				}

				filters = append(filters, dbox.Gte(field, value))
			}
		case dbox.FilterOpLte:
			var value interface{} = each.GetString("Value")

			if value.(string) != "" {
				if field == "year" {
					t, err := time.Parse(time.RFC3339Nano, value.(string))
					if err != nil {
						fmt.Println(err.Error())
					} else {
						value = t.Year()
					}
				}

				filters = append(filters, dbox.Lte(field, value))
			}
		case dbox.FilterOpEqual:
			value := each.GetString("Value")

			filters = append(filters, dbox.Eq(field, value))
		}
	}

	// for _, each := range filters {
	// fmt.Printf(">>>> %#v\n", *each)
	// }

	return dbox.And(filters...)
}
