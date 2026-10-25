import { useMemo, useState } from "react";
import Spinner from "./Spinner";
import Icon from "./Icons";
import RowActions from "./RowActions";
import { inputClass } from "./FormField";

const compareValues = (a, b) => {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  const aNum = Number(a);
  const bNum = Number(b);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && a !== "" && b !== "") {
    return aNum - bNum;
  }

  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
};

const textFor = (row, keys) =>
  keys
    .map((key) => {
      const value = key.split(".").reduce((acc, part) => acc?.[part], row);
      return value === null || value === undefined ? "" : String(value);
    })
    .join(" ")
    .toLowerCase();

const DataTable = ({
  columns,
  rows,
  getRowId = (row) => row.id,
  loading = false,
  title,
  count,
  searchPlaceholder = "Search...",
  searchKeys = [],
  searchValue,
  filters = [],
  defaultSort,
  addButton,
  rowActions,
  renderDetail,
  emptyMessage = "Nothing to show yet.",
  toolbar,
  pageSizeOptions = [10, 25, 50],
  initialPageSize = 10,
}) => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState(defaultSort?.direction ?? "asc");
  const [filterValues, setFilterValues] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [expanded, setExpanded] = useState(() => new Set());

  const filtered = useMemo(() => {
    let result = rows;

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((row) => {
        const haystack = searchValue
          ? String(searchValue(row) ?? "").toLowerCase()
          : textFor(row, searchKeys);
        return haystack.includes(term);
      });
    }

    for (const filter of filters) {
      const selected = filterValues[filter.key];
      if (selected !== undefined && selected !== "") {
        result = result.filter(
          (row) => String(filter.value(row) ?? "") === String(selected),
        );
      }
    }

    return result;
  }, [rows, search, searchValue, searchKeys, filters, filterValues]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const column = columns.find((col) => col.key === sortKey);
    const valueFor = (row) =>
      column?.sortValue
        ? column.sortValue(row)
        : sortKey.split(".").reduce((acc, part) => acc?.[part], row);

    const copy = [...filtered];
    copy.sort((a, b) => {
      const result = compareValues(valueFor(a), valueFor(b));
      return sortDir === "asc" ? result : -result;
    });
    return copy;
  }, [filtered, columns, sortKey, sortDir]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const toggleExpand = (id) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetPage = () => setPage(1);

  const showToolbar =
    searchKeys.length > 0 || searchValue || filters.length > 0 || toolbar;

  return (
    <div className="card overflow-hidden">
      {(title || addButton) && (
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            {title && (
              <h2 className="text-sm font-semibold text-content">{title}</h2>
            )}
            {count !== undefined && (
              <span className="badge badge-neutral">{count} shown</span>
            )}
          </div>
          {addButton && (
            <button type="button" onClick={addButton.onClick} className="btn btn-primary">
              <Icon name="plus" className="h-4 w-4" />
              {addButton.label}
            </button>
          )}
        </div>
      )}

      {showToolbar && (
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {(searchKeys.length > 0 || searchValue) && (
              <div className="relative w-full sm:max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
                  <Icon name="search" className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetPage();
                  }}
                  placeholder={searchPlaceholder}
                  className={`${inputClass} pl-9`}
                />
              </div>
            )}
            {filters.map((filter) => (
              <select
                key={filter.key}
                aria-label={filter.label}
                value={filterValues[filter.key] ?? ""}
                onChange={(event) => {
                  setFilterValues((current) => ({
                    ...current,
                    [filter.key]: event.target.value,
                  }));
                  resetPage();
                }}
                className={`${inputClass} sm:w-auto`}
              >
                {(filter.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : total === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-faint">
                  {renderDetail && <th className="w-8 px-2 py-3" />}
                  {columns.map((column) => {
                    const isSorted = sortKey === column.key;
                    return (
                      <th
                        key={column.key}
                        className={`px-4 py-3 font-semibold ${column.headerClassName ?? ""} ${
                          column.align === "right"
                            ? "text-right"
                            : column.align === "center"
                              ? "text-center"
                              : ""
                        }`}
                      >
                        {column.sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key)}
                            className={`inline-flex items-center gap-1 transition hover:text-content ${
                              column.align === "right" ? "flex-row-reverse" : ""
                            }`}
                          >
                            {column.header}
                            <Icon
                              name="sort"
                              className={`h-3.5 w-3.5 ${
                                isSorted ? "text-brand-strong" : "text-faint"
                              }`}
                            />
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    );
                  })}
                  {rowActions && (
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const id = getRowId(row);
                  const isOpen = expanded.has(id);
                  return (
                    <FragmentRow
                      key={id}
                      row={row}
                      columns={columns}
                      rowActions={rowActions}
                      renderDetail={renderDetail}
                      isOpen={isOpen}
                      onToggle={() => toggleExpand(id)}
                      colSpan={
                        columns.length +
                        (renderDetail ? 1 : 0) +
                        (rowActions ? 1 : 0)
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row">
              <p className="text-xs text-muted">
                Showing {start + 1}–{Math.min(start + pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  aria-label="Rows per page"
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-content outline-none focus:border-brand-500"
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} / page
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage <= 1}
                  className="btn btn-secondary !px-3 !py-1.5 !text-xs"
                >
                  Previous
                </button>
                <span className="text-xs text-muted">
                  {safePage} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  disabled={safePage >= pageCount}
                  className="btn btn-secondary !px-3 !py-1.5 !text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const FragmentRow = ({
  row,
  columns,
  rowActions,
  renderDetail,
  isOpen,
  onToggle,
  colSpan,
}) => {
  const actions = rowActions ? rowActions(row) : null;

  return (
    <>
      <tr className="border-b border-line transition last:border-0 hover:bg-surface-2">
        {renderDetail && (
          <td className="px-2 py-3 align-top">
            <button
              type="button"
              onClick={onToggle}
              aria-label={isOpen ? "Hide details" : "Show details"}
              aria-expanded={isOpen}
              className="rounded-md p-1 text-faint transition hover:bg-surface-3 hover:text-content"
            >
              <Icon
                name="chevronRight"
                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
              />
            </button>
          </td>
        )}
        {columns.map((column) => (
          <td
            key={column.key}
            className={`px-4 py-3 align-top text-content ${column.className ?? ""} ${
              column.align === "right"
                ? "text-right"
                : column.align === "center"
                  ? "text-center"
                  : ""
            }`}
          >
            {column.render ? column.render(row) : row[column.key]}
          </td>
        ))}
        {rowActions && (
          <td className="px-4 py-3 text-right align-top">
            <RowActions actions={actions} />
          </td>
        )}
      </tr>
      {renderDetail && isOpen && (
        <tr className="border-b border-line bg-surface-2 last:border-0">
          <td colSpan={colSpan} className="px-4 py-4">
            {renderDetail(row)}
          </td>
        </tr>
      )}
    </>
  );
};

export default DataTable;
