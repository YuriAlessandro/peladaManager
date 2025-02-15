import { forwardRef } from "react";
import { GroupBase } from "react-select";
import CreatableSelect, { CreatableProps } from "react-select/creatable";

const Select = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
>(
  props: CreatableProps<Option, IsMulti, Group>,
  ref: React.Ref<CreatableSelect>
) => (
  <CreatableSelect
    {...props}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ref={ref as any}
    classNames={{
      control: ({ isDisabled }) =>
        {
          return `!tw-bg-emerald-400 !tw-bg-opacity-10 tw-py-2 tw-rounded-lg !tw-border-emerald-400 disabled:!tw-bg-emerald-400
        ${isDisabled && "tw-opacity-50"}
      `;
        },
      container: () => "!tw-rounded-lg",
      menuList: () => "!tw-bg-emerald-400 !tw-bg-opacity-10",
      multiValueRemove: ({ data }) => (
        typeof data === 'object' && data && 'isFixed' in data && data.isFixed ? '!tw-hidden' : 'tw-text-gray-600' 
      ),
      multiValueLabel: ({ data }) => (
        typeof data === 'object' && data && 'isFixed' in data && data.isFixed ? '!tw-pr-2' : ''
      ),
      clearIndicator: () => "hover:!tw-text-white tw-cursor-pointer",
      dropdownIndicator: () => "hover:!tw-text-white tw-cursor-pointer",
      input: () => "!tw-text-white",
      option: (props) =>
        `
        !tw-bg-[#192b27] hover:!tw-bg-emerald-400 hover:!tw-text-white 
        ${(props.isSelected || props.isFocused) && "!tw-bg-emerald-400"}
        }`,
    }}
  />
);

export default forwardRef(Select);
