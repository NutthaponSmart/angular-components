import { SortDirection } from '@angular/material/sort';

import isEqual from 'lodash-es/isEqual';
import { BehaviorSubject } from 'rxjs';

import { UiGridColumnDirective } from '../body/ui-grid-column.directive';
import { ISortModel } from '../models';

/**
 * @internal
 * @ignore
 */
const SORT_CYCLE_MAP: Record<SortDirection, SortDirection> = {
    '': 'asc',
    'asc': 'desc',
    'desc': '',
};

/**
 * Handles the sort state of every grid column.
 *
 * @export
 * @ignore
 * @internal
 */
export class SortManager<T> {
    /**
     * sort model of single which has to be sorted
     *
     */
    public sort$ = new BehaviorSubject<ISortModel<T>>({} as ISortModel<T>);

    /**
     * sort model of array of columns which has to sorted
     *
     */
    public multiSort$ = new BehaviorSubject<ISortModel<T>[]>([]);

    /**
     * column by which grid is grouped, default is null
     *
     */
    public groupedBy: UiGridColumnDirective<T> | null = null;

    /**
     * columns by which it has been sorted. Actual multiSort$ is generated by appending @param _sortedBy to @param groupedBy
     *
     */
    private _sortedBy: UiGridColumnDirective<T>[] = [];

    constructor(
        private _columns: UiGridColumnDirective<T>[] = [],
    ) { }

    public get columns() {
        return this._columns;
    }

    public set columns(columns: UiGridColumnDirective<T>[]) {
        this._columns = columns;

        const sortedColumn = columns.find(column => column.sort !== '');

        if (!sortedColumn) {
            if (!isEqual(this.sort$.getValue(), {})) {
                this.sort$.next({} as ISortModel<T>);
            }
            return;
        }

        this._emitSort([sortedColumn]);
    }

    /**
     * handle grouping
     *
     * @param groupBy column by which it has to be grouped
     */
    public changeGroup(column: UiGridColumnDirective<T> | null) {

        let previousGroupedBy: UiGridColumnDirective<T> | null = null;
        if (this.groupedBy) {
            previousGroupedBy = { ...this.groupedBy } as UiGridColumnDirective<T>;
        }

        this.groupedBy = null;
        if (column) {
            this.groupedBy = { ...column } as UiGridColumnDirective<T>;
            this.groupedBy.sort = 'asc';
        }

        if (this._sortedBy.length) {
            this._columns
                .filter(c => c.sortable && c.property !== this._sortedBy[0].property)
                .forEach(c => c.sort = '');
        } else if (previousGroupedBy) {
            this._sortedBy.push(previousGroupedBy);
        }

        this._emitSort(this._sortedBy);
    }

    /**
     * Handles multiple column sorting, if in sortedArray element already exists
     * subscribe to sort$ to get single element, for multiple columns use multiSort$,
     * In case of grouping multiSort$ will have groupedBy Column in first position
     *
     * @param column Array of columns for whom sorting has to be done, its first element will be primary sort
     */
    public changeSort(column: UiGridColumnDirective<T>) {

        if (!column.sortable) { return; }

        this._columns
            .filter(c => c.sortable && c.property !== column.property)
            .forEach(c => c.sort = '');

        column.sort = SORT_CYCLE_MAP[column.sort];

        if (!column.sort) {
            this._sortedBy = [];
        }

        const index = this._sortedBy.findIndex(c => c.property === column.property);
        if (index >= 0) {
            this._sortedBy.splice(index, 1);
        }

        if (this.groupedBy && column.property === this.groupedBy.property) {
            this.groupedBy = { ...column } as UiGridColumnDirective<T>;
        }
        this._sortedBy.unshift({ ...column } as UiGridColumnDirective<T>);
        this._emitSort(this._sortedBy);
    }

    public destroy() {
        this.sort$.complete();
        this.multiSort$.complete();
    }

    private _emitSort(columns: UiGridColumnDirective<T>[]) {

        const sortableColumns = [...columns];

        if (this.groupedBy) {
            this._updateSortableColumns(sortableColumns);
        }

        const updatedSort = sortableColumns.map((column: UiGridColumnDirective<T>) => ({
            direction: column.sort,
            field: column.property,
            title: column.title,
        } as ISortModel<T>));

        if (isEqual(this.multiSort$.getValue(), updatedSort)) { return; }

        this.sort$.next(updatedSort[0]);
        this.multiSort$.next(updatedSort);
    }

    private _updateSortableColumns(sortableColumns: UiGridColumnDirective<T>[]) {
        const index = sortableColumns.findIndex(c => c.property === this.groupedBy!.property);
        if (index > 0) {
            sortableColumns.splice(index, 1);
            sortableColumns.unshift(this.groupedBy!);
        } else if (index < 0) {
            sortableColumns.unshift(this.groupedBy!);
        } else if (index === 0 && sortableColumns[0].sort === '') {
            sortableColumns[0].sort = 'asc';
        }
    }
}
