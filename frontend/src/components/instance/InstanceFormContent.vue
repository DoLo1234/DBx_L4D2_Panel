<template>
  <el-form
    :model="form"
    :rules="rules"
    ref="formRef"
    label-width="120px"
    class="add-instance-form-content"
  >
    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="服务器选择" prop="serverId">
          <el-select v-model="form.serverId" placeholder="请选择服务器">
            <el-option
              v-for="server in deployedServers"
              :key="server.name"
              :label="server.name"
              :value="server.name"
            />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="实例名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入实例名称" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="实例端口" prop="port">
          <el-input-number
            v-model="form.port"
            :min="27015"
            :max="65535"
            :step="1"
            style="width: 100%"
          />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item prop="hostName">
          <template #label>
            <div style="display: flex; align-items: center; gap: 2px">
              服务器名
              <el-tooltip
                content="如果使用中文，必须要给服务器安装-修复CFG中文字符加载修复插件"
                placement="top"
              >
                <Icon class="info-icon" icon="mdi:help-circle" />
              </el-tooltip>
            </div>
          </template>
          <el-input v-model="form.hostName" placeholder="请输入服务器名" />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item prop="maxPlayers">
          <template #label>
            <div style="display: flex; align-items: center; gap: 2px">
              最大玩家
              <el-tooltip
                content="要安装插件才能突破4人限制，否则只能支持4人玩家"
                placement="top"
              >
                <Icon class="info-icon" icon="mdi:help-circle" />
              </el-tooltip>
            </div>
          </template>
          <el-input-number
            v-model="form.maxPlayers"
            :min="4"
            :max="31"
            :step="1"
            style="width: 100%"
          />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="启动地图" prop="startMap">
          <el-select v-model="form.startMap" placeholder="请选择启动地图">
            <el-option-group
              v-for="campaign in mapCampaigns"
              :key="campaign.label"
              :label="campaign.label"
            >
              <el-option
                v-for="map in campaign.maps"
                :key="map.value"
                :label="map.label"
                :value="map.value"
              />
            </el-option-group>
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="游戏模式" prop="gameMode"
          ><el-select v-model="form.gameMode" placeholder="请选择游戏模式">
            <el-option
              v-for="mode in gameModeList"
              :key="mode.value"
              :label="mode.label"
              :value="mode.value"
            />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item label="Tick刷新率" prop="tickRate">
          <el-select v-model="form.tickRate" placeholder="请选择Tick率">
            <el-option
              v-for="tick in tickList"
              :key="tick.value"
              :label="tick.label"
              :value="tick.value"
            />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-form-item prop="insecure">
          <template #label>
            <div style="display: flex; align-items: center; gap: 2px">
              -insecure模式
              <el-tooltip
                content="启用：关闭VAC验证 | 禁用：打开VAC验证"
                placement="top"
              >
                <Icon class="info-icon" icon="mdi:help-circle" />
              </el-tooltip>
            </div>
          </template>
          <el-switch
            v-model="form.insecure"
            active-text="启用"
            inactive-text="禁用"
            active-value="-insecure"
            inactive-value="-secure"
          />
        </el-form-item>
      </el-col>
      <el-col :xs="24">
        <el-form-item label="额外参数" prop="extraParams">
          <el-input
            v-model="form.extraParams"
            placeholder="额外启动参数"
            style="width: 100%"
            clearable
          />
        </el-form-item>
        <el-form-item class="other-common">
          <el-alert
            title="如果不清楚额外参数，建议保持默认值"
            type="info"
            :closable="false"
            show-icon
          >
          </el-alert>
        </el-form-item>
      </el-col>
      <el-col :xs="24">
        <el-button type="primary" @click="submitForm">{{
          submitText
        }}</el-button>
        <el-button @click="cancelForm">取消</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-col>
    </el-row>
  </el-form>
</template>

<script setup>
import { ref, reactive } from "vue";
import { ElMessage } from "element-plus";
import { Icon } from "@iconify/vue";
import { mapCampaigns, tickList, gameModeList } from "./InstanceData.js";

// Props
const props = defineProps({
  deployedServers: {
    type: Array,
    default: () => [],
  },
  existingInstances: {
    type: Array,
    default: () => [],
  },
  formData: {
    type: Object,
    default: () => {},
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
  submitText: {
    type: String,
    default: "保存",
  },
});

// Emits
const emit = defineEmits(["save", "cancel"]);
// Form
const formRef = ref(null);
const form = reactive({
  serverId: props.formData.serverId || "",
  name: props.formData.name || "",
  port: props.formData.port || 27015,
  hostName: props.formData.hostName || "",
  // 当前玩家数
  currentPlayers: 0,
  tickRate: props.formData.tickRate || "",
  insecure: props.formData.insecure || "-secure",
  gameMode: props.formData.gameMode || "",
  maxPlayers: props.formData.maxPlayers || 8,
  startMap: props.formData.startMap || "c1m1_hotel",
  extraParams: props.formData.extraParams || "",
  runInfo: props.formData.runInfo || {},
});

const rules = reactive({
  serverId: [{ required: true, message: "请选择服务器", trigger: "change" }],
  name: [
    { required: true, message: "请输入实例名称", trigger: "blur" },
    { min: 2, max: 20, message: "实例名称长度应在2-20之间", trigger: "blur" },
  ],
  port: [{ required: true, message: "请输入实例端口", trigger: "blur" }],
  hostName: [{ required: true, message: "请输入服务器名", trigger: "blur" }],
  maxPlayers: [
    { required: true, message: "请输入最大玩家数", trigger: "blur" },
  ],
  startMap: [{ required: true, message: "请选择启动地图", trigger: "blur" }],
  tickRate: [{ required: true, message: "请选择Tick率", trigger: "blur" }],
  gameMode: [{ required: true, message: "请选择游戏模式", trigger: "blur" }],
});

// Methods
const submitForm = async () => {
  if (!formRef.value) return;

  try {
    const checkForm = await formRef.value.validate();
    if (!checkForm) return;

    // 检查端口和名称是否已存在
    let isNameExists = false;
    let isPortExists = false;

    if (props.isEdit) {
      // 编辑模式下排除当前实例
      isNameExists = props.existingInstances.some(
        (instance) =>
          instance.name === form.name && instance.port !== form.port,
      );
      isPortExists = props.existingInstances.some(
        (instance) =>
          instance.port === form.port && instance.name !== form.name,
      );
    } else {
      // 添加模式下检查所有实例
      isNameExists = props.existingInstances.some(
        (instance) => instance.name === form.name,
      );
      isPortExists = props.existingInstances.some(
        (instance) => instance.port === form.port,
      );
    }

    if (isNameExists && isPortExists) {
      ElMessage.error("该实例名已被使用，请选择其他名称和端口");
      return;
    }

    // 触发保存事件，传递表单数据和编辑模式
    emit("save", { ...form, isEdit: props.isEdit });
  } catch (error) {
    console.error("表单验证失败:", error);
  }
};

const cancelForm = () => {
  emit("cancel");
};

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  // 手动重置表单数据
  // if (props.formData && Object.keys(props.formData).length > 0) {
  //   Object.assign(form, {
  //     serverId: props.formData.serverId || "",
  //     name: props.formData.name || "",
  //     port: props.formData.port || 27015,
  //     hostName: props.formData.hostName || "",
  //     maxPlayers: props.formData.maxPlayers || 8,
  //     startMap: props.formData.startMap || "c1m1_hotel",
  //     extraParams: props.formData.extraParams || "",
  //     tickRate: props.formData.tickRate || "",
  //     gameMode: props.formData.gameMode || "",
  //   });
  // } else {
  //   form.serverId = "";
  //   form.name = "";
  //   form.port = 27015;
  //   form.hostName = "";
  //   form.maxPlayers = 8;
  //   form.startMap = "c1m1_hotel";
  //   form.extraParams = "";
  //   form.tickRate = "";
  //   form.gameMode = "";
  // }
};
</script>

<style scoped lang="scss">
.add-instance-form-content {
  padding: 20px;
  background-color: #f9fafb;
  border-radius: 8px;
}

.other-common {
  :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }
}
</style>
